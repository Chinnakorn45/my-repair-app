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

// Helper: build WHERE clause for year/month filters
const buildDateFilter = (query, paramIndex = 1) => {
    const { year, month } = query;
    let where = '';
    const params = [];

    if (year && year !== 'all') {
        where += ` AND EXTRACT(YEAR FROM r.created_at) = $${paramIndex}`;
        params.push(parseInt(year));
        paramIndex++;
    }
    if (month && month !== 'all') {
        where += ` AND EXTRACT(MONTH FROM r.created_at) = $${paramIndex}`;
        params.push(parseInt(month));
        paramIndex++;
    }

    return { where, params, paramIndex };
};

// 1. Get Summary Stats
router.get('/summary', verifyRole, async (req, res) => {
    try {
        const { where, params } = buildDateFilter(req.query);
        const baseWhere = where ? `WHERE 1=1 ${where}` : '';

        // Use alias 'r' for consistency with buildDateFilter
        const totalQuery = await pool.query(
            `SELECT COUNT(*) FROM repair_request r ${baseWhere}`,
            params
        );
        const statusQuery = await pool.query(`
            SELECT 
                COUNT(CASE WHEN r.status = 'pending' THEN 1 END) as pending,
                COUNT(CASE WHEN r.status = 'in_progress' THEN 1 END) as in_progress,
                COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN r.status = 'pending_approval' THEN 1 END) as pending_approval
            FROM repair_request r ${baseWhere}
        `, params);

        const avgTimeQuery = await pool.query(`
            SELECT AVG(EXTRACT(EPOCH FROM (r.updated_at - r.created_at))/3600)::numeric(10,2) as avg_hours
            FROM repair_request r
            ${baseWhere ? baseWhere + " AND r.status = 'completed'" : "WHERE r.status = 'completed'"}
        `, params);

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
        const { where, params } = buildDateFilter(req.query);

        const result = await pool.query(`
            SELECT b.name, COUNT(r.request_id) as count
            FROM repair_request r
            JOIN buildings b ON r.building_id = b.id
            WHERE 1=1 ${where}
            GROUP BY b.name
            ORDER BY count DESC
            LIMIT 5
        `, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching building stats:', err);
        res.status(500).json({ error: err.message });
    }
});

// 3. Get Technician Performance
router.get('/technician-performance', verifyRole, async (req, res) => {
    try {
        const { where, params } = buildDateFilter(req.query);

        // Need conditional JOIN based on filter
        const hasFilter = where.length > 0;
        const result = await pool.query(`
            SELECT 
                u.first_name as name,
                COUNT(r.request_id) as total_tasks,
                COUNT(CASE WHEN r.status = 'completed' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN r.status = 'in_progress' THEN 1 END) as active_tasks
            FROM "USER" u
            LEFT JOIN repair_request r ON u.user_id = r.assigned_to ${hasFilter ? 'AND 1=1 ' + where : ''}
            WHERE u.role = 'technician'
            GROUP BY u.user_id, u.first_name
            ORDER BY completed_tasks DESC
        `, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching technician stats:', err);
        res.status(500).json({ error: err.message });
    }
});

// 4. Get Monthly Trends
router.get('/monthly-trends', verifyRole, async (req, res) => {
    try {
        const { year, month } = req.query;
        let query, params = [];

        if (year && year !== 'all') {
            // Show monthly breakdown for that year
            query = `
                SELECT 
                    TO_CHAR(created_at, 'YYYY-MM') as month,
                    COUNT(*) as count
                FROM repair_request
                WHERE EXTRACT(YEAR FROM created_at) = $1
                GROUP BY month
                ORDER BY month ASC
            `;
            params = [parseInt(year)];
        } else {
            // Default: last 6 months
            query = `
                SELECT 
                    TO_CHAR(created_at, 'YYYY-MM') as month,
                    COUNT(*) as count
                FROM repair_request
                WHERE created_at >= NOW() - INTERVAL '6 months'
                GROUP BY month
                ORDER BY month ASC
            `;
        }

        const result = await pool.query(query, params);
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching monthly trends:', err);
        res.status(500).json({ error: err.message });
    }
});

// 5. Get available years for filter
router.get('/available-years', verifyRole, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT EXTRACT(YEAR FROM created_at)::int as year
            FROM repair_request
            ORDER BY year DESC
        `);
        res.json(result.rows.map(r => r.year));
    } catch (err) {
        console.error('Error fetching available years:', err);
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
