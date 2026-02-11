const express = require('express');
const pool = require('../database');
const router = express.Router();

// GET all announcements (ordered by newest first)
router.get('/', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// POST new announcement (Admin only - middleware check done in server.js or here if needed)
router.post('/', async (req, res) => {
    const { title, content, user_id } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO announcements (title, content, created_by) VALUES ($1, $2, $3) RETURNING *',
            [title, content, user_id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

// DELETE announcement
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM announcements WHERE id = $1', [id]);
        res.json({ success: true, message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
