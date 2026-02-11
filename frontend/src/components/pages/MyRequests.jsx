import { useState, useEffect } from 'react';
import './MyRequests.css';
import Swal from 'sweetalert2';
import {
  Clock, Wrench, CheckCircle, MapPin,
  Calendar, ChevronRight, AlertCircle
} from 'lucide-react';

const MyRequests = ({ userId }) => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchMyRequests();
  }, [userId]);

  const fetchMyRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/repair-requests/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Failed to fetch requests');

      const data = await response.json();
      if (Array.isArray(data)) {
        // Filter only active requests (pending or in_progress)
        const activeRequests = data.filter(req =>
          ['pending', 'in_progress', 'pending_approval'].includes(req.status)
        );
        setRequests(activeRequests);
      }
    } catch (error) {
      console.error('Error fetching my requests:', error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status) => {
    switch (status) {
      case 'pending': return { icon: Clock, color: 'warning', text: 'รอดำเนินการ' };
      case 'in_progress': return { icon: Wrench, color: 'info', text: 'กำลังซ่อม' };
      case 'pending_approval': return { icon: CheckCircle, color: 'success', text: 'รออนุมัติ' };
      default: return { icon: Clock, color: 'secondary', text: status };
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('th-TH', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  // Helper for deleting
  const handleDelete = async (reqId) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "คุณต้องการลบรายการแจ้งซ่อมนี้ใช่หรือไม่?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`http://localhost:5000/api/repair-requests/${reqId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          Swal.fire('ลบสำเร็จ!', 'รายการแจ้งซ่อมถูกลบแล้ว', 'success');
          setRequests(requests.filter(r => r.id !== reqId));
          setShowModal(false);
        } else {
          const data = await response.json();
          Swal.fire('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถลบได้', 'error');
        }
      } catch (error) {
        Swal.fire('เกิดข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
      }
    }
  };

  // Helper for Updating
  const [isEditing, setIsEditing] = useState(false);
  const [editDesc, setEditDesc] = useState('');

  const startEdit = (req) => {
    setEditDesc(req.description);
    setIsEditing(true);
  };

  const saveEdit = async () => {
    if (!selectedRequest) return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/repair-requests/${selectedRequest.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ description: editDesc })
      });

      if (response.ok) {
        Swal.fire('บันทึกสำเร็จ', 'แก้ไขรายละเอียดเรียบร้อย', 'success');
        setIsEditing(false);
        // Update local state
        const updatedRequests = requests.map(r => r.id === selectedRequest.id ? { ...r, description: editDesc } : r);
        setRequests(updatedRequests);
        setSelectedRequest({ ...selectedRequest, description: editDesc });
      } else {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถแก้ไขได้', 'error');
      }
    } catch (error) {
      console.error(error);
      Swal.fire('เกิดข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
    }
  };

  return (
    <div className="my-requests-container">
      <div className="page-header">
        <h1>รายการแจ้งซ่อมของฉัน</h1>
        <p className="subtitle">ติดตามสถานะงานซ่อมที่กำลังดำเนินการ</p>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>กำลังโหลดข้อมูล...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} />
          <p>ไม่มีรายการแจ้งซ่อมที่กำลังดำเนินการ</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((req) => {
            const status = getStatusConfig(req.status);
            const StatusIcon = status.icon;

            return (
              <div
                key={req.id}
                className="request-card"
                onClick={() => { setSelectedRequest(req); setShowModal(true); setIsEditing(false); }}
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
                      {formatDate(req.created_at)}
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
              <h2>{isEditing ? 'แก้ไขรายการ' : 'รายละเอียดงานซ่อม'}</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <div className="modal-body">
              <div className="detail-section">
                <span className="req-id-large">#{selectedRequest.id}</span>
                <div className={`status-banner ${getStatusConfig(selectedRequest.status).color}`}>
                  {getStatusConfig(selectedRequest.status).text}
                </div>
              </div>

              {selectedRequest.image_url && !isEditing && (
                <div className="detail-image">
                  <img src={`http://localhost:5000${selectedRequest.image_url}`} alt="Problem" />
                </div>
              )}

              <div className="detail-grid">
                <div className="detail-item full">
                  <label>รายละเอียดปัญหา</label>
                  {isEditing ? (
                    <textarea
                      className="edit-textarea"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows="4"
                    />
                  ) : (
                    <p>{selectedRequest.description}</p>
                  )}
                </div>

                <div className="detail-item">
                  <label>สถานที่</label>
                  <p>{selectedRequest.building_name || 'ไม่ระบุ'}</p>
                </div>

                <div className="detail-item">
                  <label>วันที่แจ้ง</label>
                  <p>{formatDate(selectedRequest.created_at)}</p>
                </div>

                {selectedRequest.admin_note && (
                  <div className="detail-item full note">
                    <label>หมายเหตุจากเจ้าหน้าที่</label>
                    <p>{selectedRequest.admin_note}</p>
                  </div>
                )}
              </div>

              {/* Action Buttons for Pending Requests */}
              {selectedRequest.status === 'pending' && (
                <div className="modal-actions" style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                  {isEditing ? (
                    <>
                      <button className="save-btn" onClick={saveEdit} style={{ flex: 1, padding: '10px', background: '#28a745', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>บันทึก</button>
                      <button className="cancel-edit-btn" onClick={() => setIsEditing(false)} style={{ flex: 1, padding: '10px', background: '#6c757d', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>ยกเลิก</button>
                    </>
                  ) : (
                    <>
                      <button className="edit-btn" onClick={() => startEdit(selectedRequest)} style={{ flex: 1, padding: '10px', background: '#ffc107', color: '#000', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>✏️ แก้ไข</button>
                      <button className="delete-btn" onClick={() => handleDelete(selectedRequest.id)} style={{ flex: 1, padding: '10px', background: '#dc3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>🗑️ ลบ</button>
                    </>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyRequests;