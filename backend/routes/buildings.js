const express = require('express');
const router = express.Router();
const axios = require('axios');

// Middleware สำหรับตรวจสอบ token (ใช้ร่วมกับระบบที่มีอยู่)
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'ไม่พบ token' });
  }

  // ใช้ jwt.verify ตามที่มีในระบบเดิม
  const jwt = require('jsonwebtoken');
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Token ไม่ถูกต้อง' });
    }
    req.user = user;
    next();
  });
};

// Middleware สำหรับตรวจสอบสิทธิ์ Admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
    return res.status(403).json({ message: 'ไม่มีสิทธิ์เข้าถึง' });
  }
  next();
};

// ========================
// GET /api/location/details
// ดึงข้อมูลตำแหน่งจาก Nominatim (Reverse Geocoding)
// ========================
router.get('/location/details', async (req, res) => {
  const { lat, lon } = req.query;

  if (!lat || !lon) {
    return res.status(400).json({ message: 'กรุณาระบุ lat และ lon' });
  }

  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: {
        format: 'json',
        lat: lat,
        lon: lon,
        zoom: 18,
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'BuildingManagerApp/1.0'
      }
    });

    const data = response.data;
    const address = data.address || {};

    res.json({
      building: address.building || address.house || address.amenity || '',
      street: address.road || address.street || '',
      area: address.suburb || address.neighbourhood || address.village || '',
      city: address.city || address.town || '',
      state: address.state || '',
      country: address.country || '',
      postcode: address.postcode || '',
      displayName: data.display_name || ''
    });
  } catch (error) {
    console.error('Error fetching location details:', error.message);
    res.status(500).json({ 
      message: 'ไม่สามารถดึงข้อมูลตำแหน่งได้',
      error: error.message 
    });
  }
});

// ========================
// ⚠️ สำคัญมาก! ต้องประกาศ SEARCH route ก่อน /:id route
// เพราะ Express.js จะจับคู่ route ตามลำดับที่ประกาศ
// ถ้าประกาศ /:id ก่อน มันจะคิดว่า "search" คือ id
// ========================

// ========================
// GET /api/buildings/search
// ค้นหาตึกตามชื่อ
// ========================
router.get('/buildings/search', authenticateToken, async (req, res) => {
  const pool = req.app.get('db'); // ใช้ pool connection จาก app
  const { q } = req.query;

  if (!q || q.trim() === '') {
    return res.status(400).json({ message: 'กรุณาระบุคำค้นหา' });
  }

  try {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        faculty,
        lat,
        lng
      FROM buildings 
      WHERE name ILIKE $1 OR faculty ILIKE $2
      ORDER BY name ASC`,
      [`%${q}%`, `%${q}%`]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error searching buildings:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการค้นหาตึก',
      error: error.message 
    });
  }
});

// ========================
// GET /api/buildings
// ดึงรายการตึกทั้งหมด
// ========================
router.get('/buildings', authenticateToken, async (req, res) => {
  const pool = req.app.get('db'); // ใช้ pool connection จาก app

  try {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        faculty,
        lat,
        lng,
        created_at,
        updated_at
      FROM buildings 
      ORDER BY name ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching buildings:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตึก',
      error: error.message 
    });
  }
});

// ========================
// GET /api/buildings/:id
// ดึงข้อมูลตึกตาม ID
// ========================
router.get('/buildings/:id', authenticateToken, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT 
        id,
        name,
        faculty,
        lat,
        lng,
        created_at,
        updated_at
      FROM buildings 
      WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลตึก' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching building:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการดึงข้อมูลตึก',
      error: error.message 
    });
  }
});

// ========================
// POST /api/buildings
// เพิ่มตึกใหม่
// ========================
router.post('/buildings', authenticateToken, requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { name, faculty, lat, lng } = req.body;

  // Validation
  if (!name || !lat || !lng) {
    return res.status(400).json({ 
      message: 'กรุณากรอกข้อมูลให้ครบถ้วน (name, lat, lng)' 
    });
  }

  // ตรวจสอบว่าชื่อซ้ำหรือไม่
  try {
    const existing = await pool.query(
      'SELECT id FROM buildings WHERE name = $1',
      [name]
    );

    if (existing.rows.length > 0) {
      return res.status(400).json({ 
        message: 'มีชื่อตึกนี้อยู่ในระบบแล้ว' 
      });
    }

    // เพิ่มข้อมูลตึก
    const result = await pool.query(
      `INSERT INTO buildings (name, faculty, lat, lng, created_at, updated_at) 
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [name, faculty || null, parseFloat(lat), parseFloat(lng)]
    );

    res.status(201).json({
      message: 'เพิ่มข้อมูลตึกเรียบร้อย',
      building: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating building:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการเพิ่มข้อมูลตึก',
      error: error.message 
    });
  }
});

// ========================
// PUT /api/buildings/:id
// แก้ไขข้อมูลตึก
// ========================
router.put('/buildings/:id', authenticateToken, requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;
  const { name, faculty, lat, lng } = req.body;

  console.log('PUT /api/buildings/:id called'); // Debug log
  console.log('Building ID:', id); // Debug log
  console.log('Request body:', req.body); // Debug log
  console.log('User:', req.user); // Debug log

  // Validation
  if (!name || !lat || !lng) {
    return res.status(400).json({ 
      message: 'กรุณากรอกข้อมูลให้ครบถ้วน (name, lat, lng)' 
    });
  }

  try {
    // ตรวจสอบว่าตึกมีอยู่จริง
    const existing = await pool.query(
      'SELECT id FROM buildings WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      console.log('Building not found with ID:', id); // Debug log
      return res.status(404).json({ message: 'ไม่พบข้อมูลตึก' });
    }

    console.log('Building exists:', existing.rows[0]); // Debug log

    // ตรวจสอบชื่อซ้ำ (ยกเว้นตัวเอง)
    const duplicate = await pool.query(
      'SELECT id FROM buildings WHERE name = $1 AND id != $2',
      [name, id]
    );

    if (duplicate.rows.length > 0) {
      return res.status(400).json({ 
        message: 'มีชื่อตึกนี้อยู่ในระบบแล้ว' 
      });
    }

    // อัปเดตข้อมูล
    const result = await pool.query(
      `UPDATE buildings 
       SET name = $1, faculty = $2, lat = $3, lng = $4, updated_at = NOW()
       WHERE id = $5
       RETURNING *`,
      [name, faculty || null, parseFloat(lat), parseFloat(lng), id]
    );

    console.log('Building updated successfully'); // Debug log

    res.json({
      message: 'อัปเดตข้อมูลตึกเรียบร้อย',
      building: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating building:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการอัปเดตข้อมูลตึก',
      error: error.message 
    });
  }
});

// ========================
// DELETE /api/buildings/:id
// ลบตึก
// ========================
router.delete('/buildings/:id', authenticateToken, requireAdmin, async (req, res) => {
  const pool = req.app.get('db');
  const { id } = req.params;

  console.log('DELETE /api/buildings/:id called'); // Debug log
  console.log('Building ID:', id); // Debug log

  try {
    // ตรวจสอบว่าตึกมีอยู่จริง
    const existing = await pool.query(
      'SELECT id, name FROM buildings WHERE id = $1',
      [id]
    );

    if (existing.rows.length === 0) {
      console.log('Building not found with ID:', id); // Debug log
      return res.status(404).json({ message: 'ไม่พบข้อมูลตึก' });
    }

    console.log('Building exists:', existing.rows[0]); // Debug log

    // ตรวจสอบว่ามีการใช้งานตึกนี้ใน repair requests หรือไม่
    const usageCheck = await pool.query(
      'SELECT COUNT(*) as count FROM REPAIR_REQUEST WHERE building_id = $1',
      [id]
    );

    if (parseInt(usageCheck.rows[0].count) > 0) {
      return res.status(400).json({ 
        message: 'ไม่สามารถลบตึกนี้ได้ เนื่องจากมีการใช้งานในระบบแจ้งซ่อม'
      });
    }

    // ลบข้อมูลตึก
    await pool.query('DELETE FROM buildings WHERE id = $1', [id]);

    console.log('Building deleted successfully'); // Debug log

    res.json({
      message: 'ลบข้อมูลตึกเรียบร้อย',
      deleted: existing.rows[0]
    });
  } catch (error) {
    console.error('Error deleting building:', error);
    res.status(500).json({ 
      message: 'เกิดข้อผิดพลาดในการลบข้อมูลตึก',
      error: error.message 
    });
  }
});

module.exports = router;