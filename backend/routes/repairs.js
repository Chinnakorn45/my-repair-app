const express = require('express');
const router = express.Router();
const pool = require('../database');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
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

// Configure Multer
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

// POST /api/repairs - Record a repair result
router.post('/', verifyToken, upload.single('repair_image'), async (req, res) => {
    console.log('📥 REPAIR POST:', req.body);
    if (req.file) console.log('🖼️ FILE:', req.file);

    const { request_id, repair_detail, repair_status } = req.body;
    // req.user comes from verifyToken
    const user_id = req.user ? req.user.user_id : null;

    // Normalize path
    const image_path = req.file ? req.file.path.replace(/\\/g, '/') : null;

    if (!user_id) {
        console.error('❌ Missing user_id in token');
        return res.status(401).json({ message: 'User ID not found in token' });
    }

    if (!request_id || !repair_detail) {
        console.error('❌ Missing fields:', { request_id, repair_detail });
        return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
    }

    try {
        // 1. Insert into repair table
        // Check if exists first
        const check = await pool.query('SELECT * FROM repair WHERE request_id = $1', [request_id]);

        let result;
        if (check.rows.length > 0) {
            console.log('🔄 Updating existing repair record...');
            result = await pool.query(
                `UPDATE repair 
                 SET repair_detail = $1, 
                     repair_status = $2, 
                     image_after = COALESCE($3, image_after),
                     updated_at = CURRENT_TIMESTAMP
                 WHERE request_id = $4
                 RETURNING *`,
                [repair_detail, repair_status || 'completed', image_path, request_id]
            );
        } else {
            console.log('➕ Inserting new repair record...');
            result = await pool.query(
                `INSERT INTO repair (request_id, user_id, repair_detail, repair_status, image_after, repair_date)
                 VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
                 RETURNING *`,
                [request_id, user_id, repair_detail, repair_status || 'completed', image_path]
            );
        }

        console.log('✅ Repair record saved:', result.rows[0]);

        // 2. Update status in repair_request table
        await pool.query(
            `UPDATE repair_request SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE request_id = $2`,
            [repair_status || 'completed', request_id]
        );

        res.json({ message: 'บันทึกผลการซ่อมสำเร็จ', data: result.rows[0] });

    } catch (err) {
        console.error('❌ Save repair error:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
