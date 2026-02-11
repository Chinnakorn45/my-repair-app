import { useState, useEffect } from 'react';
import './History.css';
import {
  Clock, Wrench, CheckCircle, XCircle,
  MapPin, Calendar, FileText, ChevronRight,
  Camera, X
} from 'lucide-react';
import { formatThaiDateTime } from '../../utils/dateUtils';

const History = ({ userId }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // Helper to get user info if not passed as prop
  const getUserInfo = () => {
    if (userId) return { id: userId, role: localStorage.getItem('user_role') || 'user' };

    let id = localStorage.getItem('user_id');
    const role = localStorage.getItem('user_role') || 'user';

    if (!id || id === 'undefined' || id === 'null') {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          id = payload.user_id?.toString();
        } catch (e) { console.error('Token error', e); }
      }
    }
    return { id, role };
  };

  const { id: currentUserId, role: userRole } = getUserInfo();

  useEffect(() => {
    if (currentUserId) {
      fetchRepairHistory();
    }
  }, [currentUserId]);

  const fetchRepairHistory = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      let url = `http://localhost:5000/api/repair-requests/${currentUserId}`;
      if (userRole === 'technician') {
        url = `http://localhost:5000/api/technician/tasks`;
      } else if (userRole === 'admin' || userRole === 'supervisor') {
        url = `http://localhost:5000/api/admin/tasks`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch history');

      const data = await response.json();

      if (Array.isArray(data)) {
        // Normalize Data
        const normalizedData = data.map(item => ({
          ...item,
          id: item.request_id || item.id,
          // Ensure image paths are consistent
          image_url: item.image_url || (item.image ? `/${item.image}` : null) || (item.image_before_path ? `/${item.image_before_path}` : null),
          image_after: item.image_after ? (item.image_after.startsWith('/') ? item.image_after : `/${item.image_after}`) : null
        }));
        setRequests(normalizedData);
      }
    } catch (error) {
      console.error('Error fetching repairs:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(req => {
    if (filter === 'all') return true;
    return req.status === filter;
  });

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending': return { icon: Clock, color: 'warning', text: 'รอดำเนินการ' };
      case 'in_progress': return { icon: Wrench, color: 'info', text: 'กำลังซ่อม' };
      case 'completed': return { icon: CheckCircle, color: 'success', text: 'เสร็จสิ้น' };
      case 'rejected': return { icon: XCircle, color: 'error', text: 'ปฏิเสธ' };
      default: return { icon: Clock, color: 'secondary', text: 'ไม่ทราบสถานะ' };
    }
  };



  return (
    <div className="history-container">
      {/* Standardized Tabs for Filtering */}
      <div className="tabs-container" style={{ background: 'transparent', boxShadow: 'none', marginBottom: 20, padding: 0 }}>
        <div className="tabs">
          {['all', 'pending', 'in_progress', 'completed'].map(f => (
            <button
              key={f}
              className={`tab ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              <FileText size={16} />
              {f === 'all' && 'ทั้งหมด'}
              {f === 'pending' && 'รอดำเนินการ'}
              {f === 'in_progress' && 'กำลังซ่อม'}
              {f === 'completed' && 'เสร็จสิ้น'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="empty-state">
          <FileText size={48} />
          <p>ไม่พบประวัติการซ่อม</p>
        </div>
      ) : (
        <div className="history-list">
          {filteredRequests.map((req) => {
            const status = getStatusConfig(req.status);
            const StatusIcon = status.icon;

            return (
              <div
                key={req.id}
                className="history-card"
                onClick={() => { setSelectedRequest(req); setShowModal(true); }}
              >
                <div className="card-status-strip" data-status={status.color}></div>
                <div className="card-content">
                  <div className="card-header">
                    <span className="req-id">#{req.id}</span>
                    <span className={`status-badge ${status.color}`}>
                      <StatusIcon size={14} /> {status.text}
                    </span>
                  </div>

                  <h3 className="card-title">{req.description}</h3>

                  <div className="card-meta">
                    <div className="meta-item">
                      <MapPin size={16} />
                      {req.building_name || 'ไม่ระบุตึก'}
                    </div>
                    <div className="meta-item">
                      <Calendar size={16} />
                      {formatThaiDateTime(req.created_at)}
                    </div>
                  </div>
                </div>
                <div className="card-arrow">
                  <ChevronRight size={20} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>รายละเอียดงานซ่อม</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>

            <div className="modal-body">
              <div className="images-container">
                {selectedRequest.image_url && (
                  <div className="detail-image">
                    <label><Camera size={16} /> รูปก่อนซ่อม</label>
                    <img src={`http://localhost:5000${selectedRequest.image_url}`} alt="Problem" />
                  </div>
                )}
                {selectedRequest.image_after && (
                  <div className="detail-image">
                    <label><CheckCircle size={16} /> รูปหลังซ่อม</label>
                    <img src={`http://localhost:5000${selectedRequest.image_after}`} alt="Finished" />
                  </div>
                )}
              </div>

              <div className="detail-grid">
                <div className="detail-item full">
                  <label>รายละเอียดปัญหา</label>
                  <p>{selectedRequest.description}</p>
                </div>

                <div className="detail-item">
                  <label>สถานที่</label>
                  <p>{selectedRequest.building_name || 'ไม่ระบุ'}</p>
                </div>

                <div className="detail-item">
                  <label>วันที่แจ้ง</label>
                  <p>{formatThaiDateTime(selectedRequest.created_at)}</p>
                </div>

                {selectedRequest.repair_detail && (
                  <div className="detail-item full repair-detail-box">
                    <label className="repair-detail-label"><Wrench size={16} /> รายละเอียดการซ่อม</label>
                    <p>{selectedRequest.repair_detail}</p>
                  </div>
                )}

                {selectedRequest.admin_note && (
                  <div className="detail-item full note">
                    <label>หมายเหตุจากเจ้าหน้าที่</label>
                    <p>{selectedRequest.admin_note}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History;