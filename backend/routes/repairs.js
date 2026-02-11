const express = require('express');
const router = express.Router();
const pool = require('../database');

// Middleware check (optional, can import from server.js or define locally if needed, 
// but usually we rely on the one passed in or imported. 
// For now, let's assume we might need to verify token here or in server.js)
const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key_change_this';

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

// POST /api/repairs - Record a repair result
router.post('/', verifyToken, async (req, res) => {
    const { request_id, repair_detail, repair_status } = req.body;
    const user_id = req.user.user_id; // The person recording (Technician or Admin)

    if (!request_id || !repair_detail) {
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    try {
        // 1. Insert into repair table
        // Check if exists first to decide INSERT or UPDATE (idempotency)
        const check = await pool.query('SELECT * FROM repair WHERE request_id = $1', [request_id]);
        
        let result;
        if (check.rows.length > 0) {
             result = await pool.query(
                `UPDATE repair 
                 SET repair_detail = $1, repair_status = $2, updated_at = CURRENT_TIMESTAMP
                 WHERE request_id = $3
                 RETURNING *`,
                [repair_detail, repair_status || 'completed', request_id]
            );
        } else {
             result = await pool.query(
                `INSERT INTO repair (request_id, user_id, repair_detail, repair_status, repair_date)
                 VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
                 RETURNING *`,
                [request_id, user_id, repair_detail, repair_status || 'completed']
            );
        }

        // 2. Update status in repair_request table as well
        await pool.query(
            `UPDATE repair_request SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE request_id = $2`,
            [repair_status || 'completed', request_id]
        );

        res.json({ message: 'บันทึกผลการซ่อมสำเร็จ', data: result.rows[0] });

    } catch (err) {
        console.error('Save repair error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
