const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure Multer for logo upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        // Always save as logo.png (or preserve extension but strict name)
        // For simplicity, we can just name it 'logo.png' if we convert, 
        // but better to keep extension or force .png
        // Let's stick to 'logo.png' effectively overwriting previous
        cb(null, 'logo.png');
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const filetypes = /jpeg|jpg|png|gif/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images are allowed'));
    }
});

// POST /api/settings/logo
router.post('/logo', upload.single('logo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }
        // Return the URL to the logo
        res.json({
            message: 'Logo uploaded successfully',
            logoUrl: '/uploads/logo.png',
            timestamp: Date.now() // For cache busting
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ message: 'Server error during upload' });
    }
});

// GET /api/settings/logo
// Check if logo exists
router.get('/logo', (req, res) => {
    const logoPath = path.join(__dirname, '../uploads/logo.png');
    if (fs.existsSync(logoPath)) {
        res.json({ hasLogo: true, logoUrl: '/uploads/logo.png' });
    } else {
        res.json({ hasLogo: false });
    }
});

module.exports = router;
