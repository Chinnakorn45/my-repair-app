const express = require('express');
const pool = require('../database');

const router = express.Router();

// API: ดึงข้อมูลผู้ใช้ทั้งหมด (สำหรับ Admin)
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT user_id, username, email, first_name, student_id_staff_id, role, department, phone, created_at, updated_at FROM "USER" ORDER BY user_id ASC');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// API: ดึงข้อมูลผู้ใช้รายบุคคล
router.get('/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const result = await pool.query(
      'SELECT user_id, username, email, first_name, student_id_staff_id, role, department, phone, created_at, updated_at FROM "USER" WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบผู้ใช้' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// API: อัปเดตข้อมูลผู้ใช้
router.put('/:userId', async (req, res) => {
  const { userId } = req.params;
  const { first_name, email, phone, student_id_staff_id, department } = req.body;

  // Validation
  if (!first_name || !email) {
    return res.status(400).json({ error: 'กรุณากรอกชื่อและอีเมล' });
  }

  try {
    // ตรวจสอบว่าอีเมลซ้ำกับคนอื่นหรือไม่
    const emailCheck = await pool.query(
      'SELECT user_id FROM "USER" WHERE email = $1 AND user_id != $2',
      [email, userId]
    );

    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: 'อีเมลนี้ถูกใช้งานแล้ว' });
    }

    // อัปเดตข้อมูล
    const result = await pool.query(
      `UPDATE "USER" 
       SET first_name = $1, 
           email = $2, 
           phone = $3, 
           student_id_staff_id = $4, 
           department = $5,
           updated_at = NOW()
       WHERE user_id = $6
       RETURNING user_id, username, first_name, email, phone, 
                 student_id_staff_id, role, department, 
                 created_at, updated_at`,
      [first_name, email, phone, student_id_staff_id, department, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'ไม่พบข้อมูลผู้ใช้' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;