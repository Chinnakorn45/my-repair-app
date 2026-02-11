const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../database');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_this';

// API: ลงทะเบียน (Register)
router.post('/register', async (req, res) => {
  const { username, password, email, first_name, student_id_staff_id, role, department, phone } = req.body;

  try {
    // ตรวจสอบ username ซ้ำ
    const existingUser = await pool.query('SELECT * FROM "USER" WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // บันทึกผู้ใช้ใหม่
    const result = await pool.query(
      `INSERT INTO "USER" (username, password, email, first_name, student_id_staff_id, role, department, phone) 
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING user_id, username, email, role`,
      [username, hashedPassword, email, first_name, student_id_staff_id, role, department, phone]
    );

    const user = result.rows[0];
    const token = jwt.sign({ user_id: user.user_id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'สมัครสมาชิกสำเร็จ',
      token,
      user_id: user.user_id,
      role: user.role
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// API: เข้าสู่ระบบ (Login)
router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  try {
    // ค้นหาผู้ใช้
    const result = await pool.query('SELECT * FROM "USER" WHERE username = $1', [username]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    const user = result.rows[0];

    // ตรวจสอบรหัสผ่าน
    const isPasswordValid = await bcrypt.compare(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ message: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    }

    // สร้าง JWT token
    const token = jwt.sign({ user_id: user.user_id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      message: 'เข้าสู่ระบบสำเร็จ',
      token,
      user_id: user.user_id,
      role: user.role
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
