const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const POPUP_FILE = path.join(__dirname, '../data/popup.json');
const UPLOAD_DIR = path.join(__dirname, '../uploads');

// Ensure data directory exists
if (!fs.existsSync(path.join(__dirname, '../data'))) {
    fs.mkdirSync(path.join(__dirname, '../data'));
}

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Multer setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        // Always overwrite popup.jpg or popup.png
        const ext = path.extname(file.originalname);
        cb(null, 'popup' + ext);
    }
});
const upload = multer({ storage });

// GET popup settings
router.get('/', (req, res) => {
    if (fs.existsSync(POPUP_FILE)) {
        const data = fs.readFileSync(POPUP_FILE);
        res.json(JSON.parse(data));
    } else {
        res.json({ active: false, image_url: '', text: '' });
    }
});

// POST update popup settings & image
router.post('/', upload.single('image'), (req, res) => {
    const { active, text } = req.body;
    let image_url = req.body.current_image_url; // Keep existing if no new file

    if (req.file) {
        image_url = `/uploads/${req.file.filename}`;
    }

    const popupData = {
        active: active === 'true', // Multer sends body as strings
        text: text || '',
        image_url: image_url || ''
    };

    fs.writeFileSync(POPUP_FILE, JSON.stringify(popupData, null, 2));
    res.json({ success: true, data: popupData });
});

module.exports = router;
