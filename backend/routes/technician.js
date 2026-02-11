const express = require("express");
const router = express.Router();
const pool = require("../database");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ✅ ใช้ JWT_SECRET เดียวกับ server.js
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_this';

// ✅ Multer config สำหรับรูปภาพหลังซ่อม
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/repairs/';
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname);
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('รองรับเฉพาะไฟล์รูปภาพ (JPEG, PNG, GIF)'));
    }
  }
});

/* ===============================
   AUTH
================================ */
function auth(req, res, next) {
  const header = req.headers.authorization;
  console.log("🔐 Auth header:", header ? "exists" : "missing");

  if (!header) {
    console.log("❌ No authorization header");
    return res.status(401).json({ message: "No token" });
  }

  const token = header.split(" ")[1];
  console.log("🎫 Token length:", token ? token.length : 0);

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log("✅ Token decoded:", decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("❌ JWT verify error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
}

/* ===============================
   HELPER: Format Image Path
================================ */
function formatImagePath(imagePath) {
  if (!imagePath) return null;
  // แปลง backslash เป็น forward slash และเพิ่ม / ข้างหน้า
  const formattedPath = imagePath.replace(/\\/g, '/');
  return formattedPath.startsWith('/') ? formattedPath : '/' + formattedPath;
}

/* ===============================
   GET TASKS
================================ */
router.get("/tasks", auth, async (req, res) => {
  console.log("📍 Reached /api/technician/tasks");
  console.log("👤 User from token:", req.user);

  try {
    const technicianId = req.user.user_id;
    console.log("🔍 Technician ID:", technicianId);

    if (!technicianId) {
      console.log("❌ No technician ID found");
      return res.status(401).json({ message: "Invalid token payload" });
    }

    console.log("💾 Querying database...");

    const result = await pool.query(
      `
      SELECT 
        rr.request_id AS id,
        rr.request_id,
        rr.description,
        rr.status,
        COALESCE(rr.lat, b.lat) AS lat,
        COALESCE(rr.lng, b.lng) AS lng,
        rr.image_before_path AS image,
        rr.created_at,
        b.name AS building_name,
        r.image_after AS image_after
      FROM REPAIR_REQUEST rr
      LEFT JOIN buildings b ON rr.building_id = b.id
      LEFT JOIN repair r ON r.request_id = rr.request_id
      WHERE rr.assigned_to = $1
      ORDER BY rr.created_at DESC
      `,
      [technicianId]
    );

    // ✅ แปลง path ให้ถูกต้อง
    const formattedRows = result.rows.map(row => ({
      ...row,
      image: formatImagePath(row.image),
      image_after: formatImagePath(row.image_after)
    }));

    console.log("✅ Query successful, found", formattedRows.length, "tasks");
    res.json(formattedRows);
  } catch (err) {
    console.error("❌ technician/tasks error:", err);
    console.error("Error stack:", err.stack);
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   GET STATS
================================ */
router.get("/stats", auth, async (req, res) => {
  console.log("📊 Reached /api/technician/stats");

  try {
    const technicianId = req.user.user_id;

    const result = await pool.query(
      `
      SELECT 
        COUNT(*) FILTER (WHERE status = 'pending' OR status = 'in_progress') AS assigned,
        COUNT(*) FILTER (WHERE status = 'in_progress') AS in_progress,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed
      FROM REPAIR_REQUEST
      WHERE assigned_to = $1
      `,
      [technicianId]
    );

    const stats = {
      assigned: parseInt(result.rows[0].assigned) || 0,
      in_progress: parseInt(result.rows[0].in_progress) || 0,
      completed: parseInt(result.rows[0].completed) || 0
    };

    console.log("✅ Stats retrieved:", stats);
    res.json(stats);
  } catch (err) {
    console.error("❌ technician/stats error:", err);
    res.status(500).json({ error: err.message });
  }
});

/* ===============================
   UPDATE STATUS (with optional image)
================================ */
router.put("/tasks/:id/status", auth, upload.single('image_after'), async (req, res) => {
  const client = await pool.connect();

  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    console.log(`🔄 Updating task ${id} to status: ${status}`);
    if (req.file) {
      console.log(`📸 Image uploaded: ${req.file.filename}`);
    }

    // เริ่ม transaction
    await client.query('BEGIN');

    // ดึงข้อมูล request ปัจจุบัน
    const requestResult = await client.query(
      `SELECT * FROM REPAIR_REQUEST WHERE request_id = $1`,
      [id]
    );

    if (requestResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ message: "Task not found" });
    }

    const request = requestResult.rows[0];

    // อัปเดตสถานะ REPAIR_REQUEST
    const updateResult = await client.query(
      `UPDATE REPAIR_REQUEST
       SET status = $1, updated_at = CURRENT_TIMESTAMP
       WHERE request_id = $2
       RETURNING *`,
      [status, id]
    );

    // ✅ ถ้าสถานะเป็น 'completed' ให้บันทึกลงตาราง repair
    if (status === 'completed') {
      console.log("💾 Inserting into repair table...");

      const imagePath = req.file ? `uploads/repairs/${req.file.filename}` : null;
      const repairDetail = req.body.repair_detail || request.description || 'งานซ่อมเสร็จสิ้น';

      // เช็คว่ามี record อยู่แล้วหรือไม่
      const existingRepair = await client.query(
        `SELECT * FROM repair WHERE request_id = $1`,
        [id]
      );

      if (existingRepair.rows.length > 0) {
        // UPDATE ถ้ามีแล้ว
        await client.query(
          `UPDATE repair 
           SET repair_date = CURRENT_TIMESTAMP,
               repair_status = $1,
               image_after = COALESCE($2, image_after),
               repair_detail = $3,
               updated_at = CURRENT_TIMESTAMP
           WHERE request_id = $4`,
          ['completed', imagePath, repairDetail, id]
        );
        console.log("✅ Repair record updated with image:", imagePath);
      } else {
        // INSERT ถ้ายังไม่มี
        await client.query(
          `INSERT INTO repair (
            request_id, 
            user_id, 
            repair_detail, 
            repair_date, 
            repair_status, 
            image_after,
            updated_at
          ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP, $4, $5, CURRENT_TIMESTAMP)`,
          [
            id,
            req.user.user_id,
            repairDetail,
            'completed',
            imagePath
          ]
        );
        console.log("✅ Repair record created with image:", imagePath);
      }
    }

    // Commit transaction
    await client.query('COMMIT');

    res.json({
      message: 'อัปเดตสถานะสำเร็จ',
      task: updateResult.rows[0],
      image_uploaded: req.file ? true : false
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ update status error:", err);
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;