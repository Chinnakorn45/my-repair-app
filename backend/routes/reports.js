const express = require('express');
const router = express.Router();
const pool = require('../database');

// Middleware to check if user is admin or supervisor
const verifyRole = (req, res, next) => {
    if (req.user.role !== 'admin' && req.user.role !== 'supervisor') {
        return res.status(403).json({ message: 'Access denied' });
    }
    next();
};

// 1. Get Summary Stats
router.get('/summary', verifyRole, async (req, res) => {
    try {
        const totalQuery = await pool.query('SELECT COUNT(*) FROM repair_request');
        const statusQuery = await pool.query(`
      SELECT 
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN status = 'pending_approval' THEN 1 END) as pending_approval
      FROM repair_request
    `);

        // Average completion time (for completed tasks)
        const avgTimeQuery = await pool.query(`
        SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/3600)::numeric(10,2) as avg_hours
        FROM repair_request 
        WHERE status = 'completed'
    `);

        res.json({
            total: parseInt(totalQuery.rows[0].count),
            status: {
                pending: parseInt(statusQuery.rows[0].pending),
                in_progress: parseInt(statusQuery.rows[0].in_progress),
                completed: parseInt(statusQuery.rows[0].completed),
                pending_approval: parseInt(statusQuery.rows[0].pending_approval)
            },
            avg_completion_time: parseFloat(avgTimeQuery.rows[0].avg_hours || 0)
        });
    } catch (err) {
        console.error('Error fetching summary stats:', err);
        res.status(500).json({ error: err.message });
    }
});

// 2. Get Repairs by Building (Top 5)
router.get('/by-building', verifyRole, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT b.name, COUNT(r.request_id) as count
      FROM repair_request r
      JOIN buildings b ON r.building_id = b.id
      GROUP BY b.name
      ORDER BY count DESC
      LIMIT 5
    `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching building stats:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Technician Performance
router.get('/technician-performance', verifyRole, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        u.first_name as name,
        COUNT(r.request_id) as total_tasks,
        COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_tasks,
        COUNT(CASE WHEN r.status = 'in_progress' THEN 1 END) as active_tasks
      FROM "USER" u
      LEFT JOIN repair_request r ON u.user_id = r.assigned_to
      WHERE u.role = 'technician'
      GROUP BY u.user_id, u.first_name
      ORDER BY completed_tasks DESC
    `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching technician stats:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Monthly Trends (Last 6 months)
router.get('/monthly-trends', verifyRole, async (req, res) => {
    try {
        const result = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as count
      FROM repair_request
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching monthly trends:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
