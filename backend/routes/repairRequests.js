const express = require('express');
const pool = require('../database');

module.exports = (upload, io) => {
  const router = express.Router();

  // API: สร้างแจ้งซ่อมใหม่
  router.post('/', upload.single('image'), async (req, res) => {
    const { user_id, description, lat, lng, building_id } = req.body;
    const image_path = req.file ? req.file.path : null;

    try {
      const result = await pool.query(
        `INSERT INTO REPAIR_REQUEST (user_id, building_id, description, image_before_path, lat, lng, status) 
         VALUES ($1, $2, $3, $4, $5, $6, 'pending') RETURNING *`,
        [user_id, building_id || null, description, image_path, lat, lng]
      );

      // แจ้งเตือน Real-time ไปยังช่าง/Admin
      io.emit('new_request', result.rows[0]);

      res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });



  // API: ดึงรายการแจ้งซ่อมที่กำลังดำเนินการ (สำหรับแสดงบนแผนที่สาธารณะ) - Specific route
  router.get('/public/in-progress', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT r.request_id, r.lat, r.lng, r.description, r.status, b.name as location_name
         FROM REPAIR_REQUEST r
         LEFT JOIN buildings b ON b.id = r.building_id
         WHERE r.status IN ('pending', 'in_progress')`
      );

      const requests = result.rows.map(row => ({
        request_id: row.request_id,
        lat: parseFloat(row.lat),
        lng: parseFloat(row.lng),
        description: row.description,
        status: row.status,
        building_name: row.location_name || (row.lat && row.lng ? `พิกัด ${row.lat}, ${row.lng}` : 'ไม่ระบุ')
      }));

      res.json(requests);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API: ดึงรายการแจ้งซ่อมที่ยังไม่ได้รับมอบหมาย (สำหรับแสดงใน Dashboard ช่าง)
  router.get('/unassigned', async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT COUNT(*) as count FROM REPAIR_REQUEST WHERE status = 'pending'`
      );
      res.json({ count: parseInt(result.rows[0].count) || 0 });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API: ดึงสถิติการแจ้งซ่อม
  router.get('/stats/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
      const result = await pool.query(
        `SELECT 
          COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
          COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
         FROM REPAIR_REQUEST WHERE user_id = $1`,
        [userId]
      );

      if (!result.rows[0]) {
        return res.json({ pending: 0, in_progress: 0, completed: 0 });
      }

      res.json({
        pending: parseInt(result.rows[0].pending) || 0,
        in_progress: parseInt(result.rows[0].in_progress) || 0,
        completed: parseInt(result.rows[0].completed) || 0
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API: ดึงรายการการแจ้งซ่อมทั้งหมด (รวมชื่อสถานที่จาก building_id)
  router.get('/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
      const result = await pool.query(
        `SELECT r.request_id, r.user_id, r.building_id, r.description, r.status, r.created_at, r.lat, r.lng, r.image_before_path,
                b.name as location_name,
                rep.image_after, rep.repair_detail
         FROM REPAIR_REQUEST r
         LEFT JOIN buildings b ON b.id = r.building_id
         LEFT JOIN repair rep ON rep.request_id = r.request_id
         WHERE r.user_id = $1 
         ORDER BY r.created_at DESC 
         LIMIT 10`,
        [userId]
      );

      const requests = result.rows.map(row => ({
        id: row.request_id,
        request_id: row.request_id,
        user_id: row.user_id,
        building_id: row.building_id,
        description: row.description,
        status: row.status,
        created_at: row.created_at,
        lat: parseFloat(row.lat) || null,
        lng: parseFloat(row.lng) || null,
        image_before_path: row.image_before_path,
        image_url: row.image_before_path ? `/${row.image_before_path}` : null,
        image_after: row.image_after ? `/${row.image_after}` : null,
        repair_detail: row.repair_detail,
        building_name: row.location_name || (row.lat && row.lng ? `พิกัด ${row.lat}, ${row.lng}` : null),
        latitude: parseFloat(row.lat) || null,
        longitude: parseFloat(row.lng) || null
      }));

      res.json(requests);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });



  // API: ลบรายการแจ้งซ่อม
  router.delete('/:requestId', async (req, res) => {
    const { requestId } = req.params;
    try {
      const check = await pool.query('SELECT status FROM REPAIR_REQUEST WHERE request_id = $1', [requestId]);
      if (check.rows.length === 0) return res.status(404).json({ message: 'ไม่พบรายการ' });

      // ดึง role จาก token (ถ้ามี)
      let userRole = null;
      const authHeader = req.headers.authorization;
      if (authHeader) {
        try {
          const jwt = require('jsonwebtoken');
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key_change_this');
          userRole = decoded.role;
        } catch (e) { /* ignore */ }
      }

      // ผู้ใช้ทั่วไปลบได้เฉพาะ pending, admin/supervisor ลบได้ทุกสถานะ
      if (userRole !== 'admin' && userRole !== 'supervisor' && check.rows[0].status !== 'pending') {
        return res.status(400).json({ message: 'สามารถลบได้เฉพาะรายการที่รอดำเนินการเท่านั้น' });
      }

      // ลบ repair records ที่เกี่ยวข้องก่อน
      await pool.query('DELETE FROM repair WHERE request_id = $1', [requestId]);
      await pool.query('DELETE FROM REPAIR_REQUEST WHERE request_id = $1', [requestId]);
      res.json({ success: true, message: 'ลบรายการสำเร็จ' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API: แก้ไขรายการแจ้งซ่อม (Update Description & Location)
  router.put('/:requestId', upload.single('image'), async (req, res) => {
    const { requestId } = req.params;
    const { description, building_id } = req.body;

    try {
      const check = await pool.query('SELECT status FROM REPAIR_REQUEST WHERE request_id = $1', [requestId]);
      if (check.rows.length === 0) return res.status(404).json({ message: 'ไม่พบรายการ' });

      // Check User Role from Token
      let userRole = 'user';
      try {
        const authHeader = req.headers.authorization;
        if (authHeader) {
          const jwt = require('jsonwebtoken');
          const token = authHeader.split(' ')[1];
          const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_secret_key_change_this');
          userRole = decoded.role;
        }
      } catch (e) {
        console.error('Token verification failed:', e.message);
      }

      // Logic:
      // 1. If Admin/Supervisor -> Can edit description & building_id anytime (maybe warn if completed, but allow).
      // 2. If User -> Can edit description only if status == 'pending'.

      if (userRole !== 'admin' && userRole !== 'supervisor') {
        if (check.rows[0].status !== 'pending') {
          return res.status(400).json({ message: 'สามารถแก้ไขได้เฉพาะรายการที่รอดำเนินการเท่านั้น' });
        }
        // User can only update description
        await pool.query(
          'UPDATE REPAIR_REQUEST SET description = $1 WHERE request_id = $2',
          [description, requestId]
        );
      } else {
        // Admin/Supervisor can update description AND building_id
        // Construct query dynamically based on provided fields
        const fields = [];
        const values = [];
        let idx = 1;

        if (description !== undefined) {
          fields.push(`description = $${idx++}`);
          values.push(description);
        }
        if (building_id !== undefined) {
          fields.push(`building_id = $${idx++}`);
          values.push(building_id || null);
        }

        if (fields.length > 0) {
          values.push(requestId);
          const query = `UPDATE REPAIR_REQUEST SET ${fields.join(', ')} WHERE request_id = $${idx}`;
          await pool.query(query, values);
        }
      }

      res.json({ success: true, message: 'แก้ไขรายการสำเร็จ' });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });

  // API: อัปเดตสถานะแจ้งซ่อม (สำหรับ Admin/Tech)
  router.put('/:requestId/status', async (req, res) => {
    const { requestId } = req.params;
    const { status } = req.body;

    try {
      const result = await pool.query(
        `UPDATE REPAIR_REQUEST SET status = $1 WHERE request_id = $2 RETURNING *`,
        [status, requestId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'ไม่พบแจ้งซ่อม' });
      }

      res.json({ message: 'อัปเดตสถานะสำเร็จ', data: result.rows[0] });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: err.message });
    }
  });



  return router;
};
