const express = require('express');
const pool = require('../database');

const router = express.Router();

// Middleware: ตรวจสอบ Token (ต้องเพิ่มใน server.js)
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'No token provided' });
  
  try {
    const jwt = require('jsonwebtoken');
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key_change_this');
    next();
  } catch {
    res.status(401).json({ message: 'Invalid token' });
  }
};

// ========================================
// API: ดึงการแจ้งเตือนทั้งหมดของผู้ใช้
// ========================================
router.get('/', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        notification_id as id,
        type,
        title,
        message,
        is_read,
        created_at
       FROM notifications 
       WHERE user_id = $1 
       ORDER BY created_at DESC`,
      [req.user.user_id]
    );
    
    res.json(result.rows);
  } catch (err) {
    console.error('Get notifications error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// API: ทำเครื่องหมายว่าอ่านแล้ว (1 รายการ)
// ========================================
router.put('/:notificationId/read', verifyToken, async (req, res) => {
  const { notificationId } = req.params;

  try {
    const result = await pool.query(
      `UPDATE notifications 
       SET is_read = true, 
           updated_at = NOW() 
       WHERE notification_id = $1 AND user_id = $2
       RETURNING notification_id`,
      [notificationId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบการแจ้งเตือน' });
    }

    res.json({ message: 'อ่านแล้ว', notification_id: result.rows[0].notification_id });
  } catch (err) {
    console.error('Mark as read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// API: ทำเครื่องหมายว่าอ่านแล้วทั้งหมด
// ========================================
router.put('/mark-all-read', verifyToken, async (req, res) => {
  try {
    await pool.query(
      `UPDATE notifications 
       SET is_read = true, 
           updated_at = NOW() 
       WHERE user_id = $1 AND is_read = false`,
      [req.user.user_id]
    );

    res.json({ message: 'อ่านทั้งหมดแล้ว' });
  } catch (err) {
    console.error('Mark all as read error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// API: ลบการแจ้งเตือน
// ========================================
router.delete('/:notificationId', verifyToken, async (req, res) => {
  const { notificationId } = req.params;

  try {
    const result = await pool.query(
      'DELETE FROM notifications WHERE notification_id = $1 AND user_id = $2 RETURNING notification_id',
      [notificationId, req.user.user_id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบการแจ้งเตือน' });
    }

    res.json({ message: 'ลบการแจ้งเตือนสำเร็จ' });
  } catch (err) {
    console.error('Delete notification error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// API: นับจำนวนข้อความที่ยังไม่ได้อ่าน
// ========================================
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.user_id]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (err) {
    console.error('Get unread count error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ========================================
// ฟังก์ชันสร้างการแจ้งเตือน (สำหรับเรียกใช้จาก code อื่น)
// ========================================
const createNotification = async (userId, type, title, message) => {
  try {
    await pool.query(
      `INSERT INTO notifications (user_id, type, title, message, is_read) 
       VALUES ($1, $2, $3, $4, false)`,
      [userId, type, title, message]
    );
  } catch (err) {
    console.error('Create notification error:', err);
  }
};

module.exports = router;
module.exports.createNotification = createNotification;