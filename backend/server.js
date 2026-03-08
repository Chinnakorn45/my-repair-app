process.env.TZ = 'Asia/Bangkok';
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const pool = require('./database');
require('dotenv').config();

// ================= Import routes =================
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const createRepairRoutes = require('./routes/repairRequests');
const notificationRoutes = require('./routes/Notifications');
const locationRoutes = require('./routes/locations');
const technicianRoutes = require('./routes/technician');
const settingsRoutes = require('./routes/settings');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// ================= Middleware =================
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL, // Vercel URL เช่น https://my-repair-app.vercel.app
].filter(Boolean);

app.use(cors({
  origin: allowedOrigins,
  credentials: true,
}));
app.use(express.json());
app.use('/api/Notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_this';

// ================= Multer =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, 'uploads', 'requests');
    // Ensure directory exists
    const fs = require('fs');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) =>
    cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });


// ================= JWT Middleware =================
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ================= Routes =================
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/technician', technicianRoutes);

const repairRoutes = createRepairRoutes(upload, io);
app.use('/api/repair-requests', repairRoutes);

const reportsRouter = require('./routes/reports');
app.use('/api/admin/reports', verifyToken, reportsRouter);

const announcementRoutes = require('./routes/announcements');
app.use('/api/announcements', announcementRoutes);

const popupRoutes = require('./routes/popup');
app.use('/api/popup', popupRoutes);


// =====================================================
// 🔧 มอบหมายงานให้ช่าง (ASSIGN TASK)
// =====================================================
// ... (previous imports)
const repairsRouter = require('./routes/repairs'); // Import repairs route

// ... (middleware)

app.use('/api/repairs', repairsRouter); // Register repairs route

// ...

// =====================================================
// 🔧 มอบหมายงานให้ช่าง (ASSIGN TASK)
// =====================================================
app.put('/api/repair-requests/:requestId/assign', verifyToken, async (req, res) => {
  try {
    // ✅ ตรวจสอบสิทธิ์
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }

    const requestId = req.params.requestId;
    const { technician_id, is_external, external_agency } = req.body || {};

    console.log(`🔧 Assign Request: ID=${requestId}, body=`, req.body);


    // ✅ กรณีมอบหมายให้หน่วยงานภายนอก
    if (is_external) {
      if (!external_agency) {
        return res.status(400).json({ message: 'กรุณาระบุชื่อหน่วยงานภายนอก' });
      }

      const result = await pool.query(
        `UPDATE repair_request 
             SET assigned_to = NULL, 
                 is_external = TRUE, 
                 external_agency = $1, 
                 status = 'in_progress', 
                 updated_at = CURRENT_TIMESTAMP 
             WHERE request_id = $2 
             RETURNING *`,
        [external_agency, requestId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบงานที่ต้องการมอบหมาย' });
      }

      io.emit('task_assigned', {
        request_id: result.rows[0].request_id,
        is_external: true,
        external_agency: external_agency
      });

      return res.json({
        message: `มอบหมายงานให้หน่วยงานภายนอก: ${external_agency} สำเร็จ`,
        request_id: result.rows[0].request_id,
        external_agency: external_agency
      });
    }

    // ✅ กรณีมอบหมายให้ช่างภายใน
    // ✅ ตรวจสอบว่ามี technician_id
    if (!technician_id) {
      return res.status(400).json({ message: 'กรุณาเลือกช่าง หรือระบุหน่วยงานภายนอก' });
    }

    // ✅ ตรวจสอบว่ามีช่างคนนี้จริงหรือไม่
    const techCheck = await pool.query(
      'SELECT user_id, first_name FROM "USER" WHERE user_id = $1 AND role = $2',
      [technician_id, 'technician']
    );

    if (techCheck.rows.length === 0) {
      return res.status(400).json({ message: 'ไม่พบช่างที่เลือก' });
    }

    // ✅ UPDATE งานในฐานข้อมูล
    const result = await pool.query(
      `UPDATE repair_request 
       SET assigned_to = $1, 
           is_external = FALSE, 
           external_agency = NULL,
           status = 'in_progress', 
           updated_at = CURRENT_TIMESTAMP 
       WHERE request_id = $2 
       RETURNING *`,
      [technician_id, requestId]
    );

    // ✅ ตรวจสอบว่ามีงานนี้หรือไม่
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบงานที่ต้องการมอบหมาย' });
    }

    // ✅ ส่งการแจ้งเตือนผ่าน Socket.io
    io.emit('task_assigned', {
      request_id: result.rows[0].request_id,
      technician_id: technician_id,
      technician_name: techCheck.rows[0].first_name
    });

    res.json({
      message: 'มอบหมายงานสำเร็จ',
      request_id: result.rows[0].request_id,
      technician_name: techCheck.rows[0].first_name
    });

  } catch (err) {
    console.error('Assign task error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.use('/api/repair-requests', repairRoutes);

// =====================================================
// 👤 ADMIN USERS API (จัดการผู้ใช้งาน)
// =====================================================

app.get('/api/admin/users', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    const result = await pool.query(
      `SELECT user_id, username, email, first_name, student_id_staff_id, role, department, phone, specialty
       FROM "USER"
       ORDER BY role, first_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get admin users error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/users', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    const { username, password, email, first_name, student_id_staff_id, role, department, phone, specialty } = req.body;
    if (!username || !password || !first_name || !role) {
      return res.status(400).json({ message: 'กรุณากรอก username, password, ชื่อ และสิทธิ์' });
    }
    const existingUser = await pool.query('SELECT * FROM "USER" WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
    }
    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO "USER" (username, password, email, first_name, student_id_staff_id, role, department, phone, specialty) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
       RETURNING user_id, username, email, first_name, student_id_staff_id, role, department, phone, specialty`,
      [username, hashedPassword, email || null, first_name, student_id_staff_id || null, role, department || null, phone || null, role === 'technician' ? (specialty || null) : null]
    );
    res.status(201).json({ message: 'เพิ่มผู้ใช้งานสำเร็จ', user: result.rows[0] });
  } catch (err) {
    console.error('Post admin users error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/admin/users/:user_id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    }
    const { user_id } = req.params;
    const { username, password, email, first_name, student_id_staff_id, role, department, phone, specialty } = req.body;

    if (username) {
      const existingUser = await pool.query('SELECT * FROM "USER" WHERE username = $1 AND user_id != $2', [username, user_id]);
      if (existingUser.rows.length > 0) return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (username) { updates.push(`username = $${paramIndex++}`); values.push(username); }
    if (password) {
      const bcrypt = require('bcrypt');
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password = $${paramIndex++}`); values.push(hashedPassword);
    }
    if (email !== undefined) { updates.push(`email = $${paramIndex++}`); values.push(email || null); }
    if (first_name) { updates.push(`first_name = $${paramIndex++}`); values.push(first_name); }
    if (student_id_staff_id !== undefined) { updates.push(`student_id_staff_id = $${paramIndex++}`); values.push(student_id_staff_id || null); }
    if (role) { updates.push(`role = $${paramIndex++}`); values.push(role); }
    if (department !== undefined) { updates.push(`department = $${paramIndex++}`); values.push(department || null); }
    if (phone !== undefined) { updates.push(`phone = $${paramIndex++}`); values.push(phone || null); }
    if (specialty !== undefined) { updates.push(`specialty = $${paramIndex++}`); values.push(role === 'technician' ? (specialty || null) : null); }

    if (updates.length === 0) return res.status(400).json({ message: 'ไม่มีข้อมูลที่จะอัปเดต' });

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(user_id);

    await pool.query(`UPDATE "USER" SET ${updates.join(', ')} WHERE user_id = $${paramIndex}`, values);
    res.json({ message: 'อัปเดตผู้ใช้งานสำเร็จ' });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/users/:user_id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    const { user_id } = req.params;
    if (String(req.user.user_id) === String(user_id)) return res.status(400).json({ message: 'ไม่สามารถลบบัญชีตนเองได้' });
    await pool.query('DELETE FROM "USER" WHERE user_id = $1', [user_id]);
    res.json({ message: 'ลบผู้ใช้งานสำเร็จ' });
  } catch (err) {
    console.error('Delete user error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// 📊 ADMIN/SUPERVISOR API (สถิติ, ภาระงาน, งาน, รายชื่อช่าง)
// =====================================================

app.get('/api/admin/stats', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    const result = await pool.query(
      `SELECT 
        COUNT(*)::int AS total,
        COUNT(CASE WHEN status = 'pending' THEN 1 END)::int AS pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END)::int AS in_progress,
        COUNT(CASE WHEN status = 'pending_approval' THEN 1 END)::int AS pending_approval,
        COUNT(CASE WHEN status = 'completed' THEN 1 END)::int AS completed
       FROM repair_request`
    );
    res.json(result.rows[0] || { total: 0, pending: 0, in_progress: 0, pending_approval: 0, completed: 0 });
  } catch (err) {
    console.error('Get admin stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/team-workload', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    const result = await pool.query(
      `SELECT u.user_id, u.first_name AS name, COUNT(r.request_id)::int AS tasks
       FROM "USER" u
       LEFT JOIN repair_request r ON r.assigned_to = u.user_id AND r.status IN ('pending', 'in_progress', 'pending_approval')
       WHERE u.role = 'technician'
       GROUP BY u.user_id, u.first_name ORDER BY tasks DESC`
    );
    res.json(result.rows.map((r) => ({ id: r.user_id, name: r.name || 'ไม่ระบุ', tasks: r.tasks || 0 })));
  } catch (err) {
    console.error('Get team workload error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/tasks', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    const { status } = req.query;
    let query = `SELECT r.*, u.first_name AS reporter, b.name AS location_name, b.name AS location, tech.first_name AS technician_name,
       rep.image_after, rep.repair_detail
       FROM repair_request r
       LEFT JOIN "USER" u ON u.user_id = r.user_id
       LEFT JOIN buildings b ON b.id = r.building_id
       LEFT JOIN "USER" tech ON tech.user_id = r.assigned_to
       LEFT JOIN repair rep ON rep.request_id = r.request_id`;

    const params = [];
    if (status && status !== 'all') {
      const s = ['pending', 'in_progress', 'pending_approval', 'completed'].includes(status) ? status : 'pending';
      query += ` WHERE r.status = $1`;
      params.push(s);
    }

    query += ` ORDER BY r.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Get admin tasks error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/technicians', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
    const result = await pool.query(`SELECT user_id, first_name, specialty FROM "USER" WHERE role = 'technician' ORDER BY first_name`);
    res.json(result.rows.map(r => ({ id: r.user_id, name: r.first_name, specialty: r.specialty || null, initials: r.first_name.charAt(0).toUpperCase(), status: 'พร้อม' })));
  } catch (err) {
    console.error('Get technicians error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// 🏢 BUILDINGS API (ระบบตึก / ชื่อตึก / ปักหมุด)
// =====================================================

// 🔹 1. ดึงรายชื่อตึกทั้งหมด
app.get('/api/buildings', async (req, res) => {
  try {
    const result = await pool.query(`SELECT id, name, faculty, lat, lng FROM buildings ORDER BY name`);
    res.json(result.rows);
  } catch (err) {
    console.error('Get buildings error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 2. เพิ่มตึกใหม่
app.post('/api/buildings', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์ในการเพิ่มตึก' });
    const { name, faculty, lat, lng } = req.body;
    if (!name || !lat || !lng) return res.status(400).json({ message: 'กรุณากรอกชื่อตึก และพิกัด' });
    const result = await pool.query(
      `INSERT INTO buildings (name, faculty, lat, lng) VALUES ($1, $2, $3, $4) RETURNING *`,
      [name, faculty || null, parseFloat(lat), parseFloat(lng)]
    );
    res.status(201).json({ message: 'เพิ่มตึกสำเร็จ', building: result.rows[0] });
  } catch (err) {
    console.error('Post building error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 3. แก้ไขข้อมูลตึก
app.put('/api/buildings/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์แก้ไข' });
    const { id } = req.params;
    const { name, faculty, lat, lng } = req.body;

    const result = await pool.query(
      `UPDATE buildings 
       SET name = $1, faculty = $2, lat = $3, lng = $4 
       WHERE id = $5 
       RETURNING *`,
      [name, faculty || null, parseFloat(lat), parseFloat(lng), id]
    );

    if (result.rows.length === 0) return res.status(404).json({ message: 'ไม่พบตึก' });
    res.json({ message: 'อัปเดตตึกสำเร็จ', building: result.rows[0] });
  } catch (err) {
    console.error('Update building error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 4. ลบตึก
app.delete('/api/buildings/:id', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'ไม่มีสิทธิ์ลบ' });
    const { id } = req.params;
    const check = await pool.query('SELECT * FROM repair_request WHERE building_id = $1 LIMIT 1', [id]);
    if (check.rows.length > 0) return res.status(400).json({ message: 'ไม่สามารถลบได้เนื่องจากมีการแจ้งซ่อมในตึกนี้' });
    await pool.query('DELETE FROM buildings WHERE id = $1', [id]);
    res.json({ message: 'ลบตึกสำเร็จ' });
  } catch (err) {
    console.error('Delete building error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 🔹 5. หาตึกที่ใกล้พิกัดที่สุด
app.get('/api/buildings/nearest', async (req, res) => {
  let { lat, lng } = req.query;
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  if (isNaN(latitude) || isNaN(longitude)) return res.status(400).json({ message: 'lat และ lng ต้องเป็นตัวเลข' });

  try {
    const result = await pool.query(
      `SELECT id, name, faculty, lat, lng,
      (6371000 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat)))) AS distance
      FROM buildings WHERE (6371000 * acos(cos(radians($1)) * cos(radians(lat)) * cos(radians(lng) - radians($2)) + sin(radians($1)) * sin(radians(lat)))) <= 50
      ORDER BY distance LIMIT 1`, [latitude, longitude]
    );
    res.json(result.rows.length === 0 ? { found: false } : { found: true, building: result.rows[0] });
  } catch (err) {
    console.error('Find nearest building error:', err);
    res.status(500).json({ error: err.message });
  }
});

// =====================================================
// 🔧 Technician APIs
// =====================================================

app.get('/api/technician/stats', verifyToken, async (req, res) => {
  try {
    if (req.user.role !== 'technician') return res.status(403).json({ message: 'Access denied' });
    const result = await pool.query(
      `SELECT COUNT(*) as assigned, SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress, SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed
       FROM repair_request WHERE assigned_to = $1`, [req.user.user_id]
    );
    res.json({ assigned: Number(result.rows[0].assigned || 0), in_progress: Number(result.rows[0].in_progress || 0), completed: Number(result.rows[0].completed || 0) });
  } catch (err) {
    console.error('Get technician stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ================= Socket.io =================
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  // Decode token and join role-based room
  try {
    const token = socket.handshake.auth?.token;
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      socket.userRole = decoded.role;
      socket.userId = decoded.user_id;
      socket.join(`role:${decoded.role}`);
      console.log(`Socket ${socket.id} joined room role:${decoded.role}`);
    }
  } catch (err) {
    console.error('Socket auth error:', err.message);
  }

  socket.on('disconnect', () => console.log('Socket disconnected:', socket.id));
});

// ================= Global Error Handler =================
app.use((err, req, res, next) => {
  console.error('🔥 Global Error:', err);
  const fs = require('fs');
  const logMessage = `[${new Date().toISOString()}] GLOBAL ERROR: ${err.message}\nStack: ${err.stack}\n\n`;
  try { fs.appendFileSync(path.join(__dirname, 'debug_errors.log'), logMessage); } catch (e) { }

  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// ================= Start Server =================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});