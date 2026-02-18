import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  ClipboardList, Clock, Wrench, Package, CheckCircle,
  MapPin, Calendar, Camera, Upload, Inbox, ChevronRight,
  X, ImageIcon, Hash
} from 'lucide-react';
import './Mytasks.css';

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null); // for upload modal (task id)
  const [detailTask, setDetailTask] = useState(null);     // for detail modal (task object)
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [repairDetail, setRepairDetail] = useState('');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('http://localhost:5000/api/technician/tasks', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        Swal.fire('ไฟล์ใหญ่เกินไป', 'ไฟล์รูปภาพต้องมีขนาดไม่เกิน 5MB', 'warning');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('ไม่พบ token');

      if (newStatus === 'completed') {
        setSelectedTask(taskId);
        setDetailTask(null); // close detail modal
        return;
      }

      const formData = new FormData();
      formData.append('status', newStatus);

      const response = await fetch(`http://localhost:5000/api/technician/tasks/${taskId}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) throw new Error('ไม่สามารถอัปเดตสถานะได้');

      await fetchTasks();
      setDetailTask(null); // close detail modal after action
      Swal.fire({ icon: 'success', title: 'อัปเดตสำเร็จ', timer: 1200, showConfirmButton: false });
    } catch (err) {
      console.error('Error updating status:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
    }
  };

  const handleCompleteTask = async () => {
    if (!imageFile) {
      Swal.fire('แจ้งเตือน', 'กรุณาอัปโหลดรูปภาพหลังซ่อมเสร็จ', 'warning');
      return;
    }

    if (!repairDetail.trim()) {
      Swal.fire('แจ้งเตือน', 'กรุณาระบุรายละเอียดการซ่อม', 'warning');
      return;
    }

    try {
      setUploading(true);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('ไม่พบ token');

      const formData = new FormData();
      formData.append('status', 'completed');
      formData.append('image_after', imageFile);
      formData.append('repair_detail', repairDetail);

      const response = await fetch(`http://localhost:5000/api/technician/tasks/${selectedTask}/status`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || 'ไม่สามารถอัปเดตสถานะได้');
      }

      setSelectedTask(null);
      setImageFile(null);
      setImagePreview(null);
      setRepairDetail('');
      await fetchTasks();
      Swal.fire({
        icon: 'success',
        title: 'บันทึกสำเร็จ',
        text: 'บันทึกงานเสร็จสิ้นแล้ว!',
        timer: 1500,
        showConfirmButton: false
      });
    } catch (err) {
      console.error('Error completing task:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  const closeUploadModal = () => {
    setSelectedTask(null);
    setImageFile(null);
    setImagePreview(null);
    setRepairDetail('');
  };

  const getStatusText = (status) => {
    const statusMap = {
      'pending': 'รอรับงาน',
      'in_progress': 'กำลังดำเนินการ',
      'waiting_parts': 'รอวัสดุ',
      'completed': 'เสร็จสิ้น',
      'pending_approval': 'รออนุมัติ'
    };
    return statusMap[status] || status;
  };

  const getStatusClass = (status) => {
    const classMap = {
      'pending': 'pending',
      'in_progress': 'in-progress',
      'waiting_parts': 'waiting-parts',
      'completed': 'completed',
      'pending_approval': 'pending-approval'
    };
    return classMap[status] || 'pending';
  };

  const getFilteredTasks = () => {
    if (filterStatus === 'all') return tasks;
    return tasks.filter(t => t.status === filterStatus);
  };

  const filteredTasks = getFilteredTasks();

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  return (
    <div className="my-tasks-page">
      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button
          className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}
        >
          <span className="tab-icon"><ClipboardList size={18} /></span>
          <span className="tab-text">ทั้งหมด</span>
          <span className="tab-badge">{tasks.length}</span>
        </button>

        <button
          className={`filter-tab ${filterStatus === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilterStatus('in_progress')}
        >
          <span className="tab-icon"><Wrench size={18} /></span>
          <span className="tab-text">กำลังซ่อม</span>
          <span className="tab-badge">{tasks.filter(t => t.status === 'in_progress').length}</span>
        </button>
        <button
          className={`filter-tab ${filterStatus === 'waiting_parts' ? 'active' : ''}`}
          onClick={() => setFilterStatus('waiting_parts')}
        >
          <span className="tab-icon"><Package size={18} /></span>
          <span className="tab-text">รอวัสดุ</span>
          <span className="tab-badge">{tasks.filter(t => t.status === 'waiting_parts').length}</span>
        </button>
        <button
          className={`filter-tab ${filterStatus === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterStatus('completed')}
        >
          <span className="tab-icon"><CheckCircle size={18} /></span>
          <span className="tab-text">เสร็จแล้ว</span>
          <span className="tab-badge">{tasks.filter(t => t.status === 'completed').length}</span>
        </button>
      </div>

      {/* Tasks Container */}
      <div className="tasks-container">
        <div className="tasks-header">
          <h2>
            {filterStatus === 'all' && 'งานทั้งหมด'}
            {filterStatus === 'pending' && 'งานรอรับ'}
            {filterStatus === 'in_progress' && 'งานกำลังซ่อม'}
            {filterStatus === 'waiting_parts' && 'งานรอวัสดุ'}
            {filterStatus === 'completed' && 'งานเสร็จแล้ว'}
          </h2>
          <p>คลิกที่รายการเพื่อดูรายละเอียด</p>
        </div>
        <div className="tasks-content">
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Inbox size={48} /></div>
              <div className="empty-text">ไม่พบรายการงานซ่อม</div>
            </div>
          ) : (
            <div className="tasks-grid">
              {filteredTasks.map((task) => (
                <div
                  key={task.id}
                  className="task-card"
                  onClick={() => setDetailTask(task)}
                >
                  {/* Status indicator bar */}
                  <div className={`task-card-status-indicator ${getStatusClass(task.status)}`} />

                  {/* Thumbnail */}
                  <div className="task-card-thumb">
                    {task.image ? (
                      <img
                        src={`http://localhost:5000${task.image.replace(/\\/g, '/').replace('//', '/')}`}
                        alt=""
                        onError={(e) => {
                          e.target.style.display = 'none';
                          e.target.parentElement.innerHTML = '<div class="task-card-thumb-placeholder"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg></div>';
                        }}
                      />
                    ) : (
                      <div className="task-card-thumb-placeholder">
                        <ImageIcon size={24} />
                      </div>
                    )}
                  </div>

                  {/* Body */}
                  <div className="task-card-body">
                    <div className="task-card-top">
                      <p className="task-card-desc">{task.description}</p>
                      <span className="task-card-id">#{task.id}</span>
                    </div>
                    <div className="task-card-meta">
                      <span className="task-card-meta-item">
                        <MapPin size={14} />
                        {task.building_name || 'ไม่ระบุ'}
                      </span>
                      <span className="task-card-meta-item">
                        <Calendar size={14} />
                        {new Date(task.created_at).toLocaleDateString('th-TH', {
                          day: 'numeric', month: 'short'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="task-card-right">
                    <span className={`status-badge ${getStatusClass(task.status)}`}>
                      {getStatusText(task.status)}
                    </span>
                    <ChevronRight size={18} className="task-card-chevron" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ===================== Detail Modal ===================== */}
      {detailTask && (
        <div className="detail-overlay" onClick={() => setDetailTask(null)}>
          <div className="detail-modal" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="detail-modal-header">
              <h2><Wrench size={20} /> รายละเอียดงาน #{detailTask.id}</h2>
              <button className="detail-close-btn" onClick={() => setDetailTask(null)}>
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="detail-modal-body">
              {/* Description */}
              <div className="detail-section">
                <div className="detail-section-title">รายละเอียด</div>
                <div className="detail-description">{detailTask.description}</div>
              </div>

              {/* Meta info */}
              <div className="detail-section">
                <div className="detail-section-title">ข้อมูลงาน</div>
                <div className="detail-meta-grid">
                  <div className="detail-meta-item">
                    <div className="detail-meta-icon id-icon"><Hash size={18} /></div>
                    <div>
                      <div className="detail-meta-label">รหัสงาน</div>
                      <div className="detail-meta-value">#{detailTask.id}</div>
                    </div>
                  </div>
                  <div className="detail-meta-item">
                    <div className="detail-meta-icon status"><CheckCircle size={18} /></div>
                    <div>
                      <div className="detail-meta-label">สถานะ</div>
                      <div className="detail-meta-value">{getStatusText(detailTask.status)}</div>
                    </div>
                  </div>
                  <div className="detail-meta-item">
                    <div className="detail-meta-icon location"><MapPin size={18} /></div>
                    <div>
                      <div className="detail-meta-label">สถานที่</div>
                      <div className="detail-meta-value">{detailTask.building_name || 'ไม่ระบุ'}</div>
                    </div>
                  </div>
                  <div className="detail-meta-item">
                    <div className="detail-meta-icon date"><Calendar size={18} /></div>
                    <div>
                      <div className="detail-meta-label">วันที่แจ้ง</div>
                      <div className="detail-meta-value">
                        {new Date(detailTask.created_at).toLocaleDateString('th-TH', {
                          year: 'numeric', month: 'short', day: 'numeric'
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Images */}
              {(detailTask.image || detailTask.image_after) && (
                <div className="detail-section">
                  <div className="detail-section-title">รูปภาพ</div>
                  <div className={`detail-images ${!detailTask.image || !detailTask.image_after ? '' : ''}`}>
                    {detailTask.image && (
                      <div className={`detail-image-card ${!detailTask.image_after ? 'single' : ''}`}>
                        <div className="detail-image-label before">
                          <Camera size={14} /> ก่อนซ่อม
                        </div>
                        <img
                          src={`http://localhost:5000${detailTask.image.replace(/\\/g, '/').replace('//', '/')}`}
                          alt="ก่อนซ่อม"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}
                    {detailTask.image_after && (
                      <div className={`detail-image-card ${!detailTask.image ? 'single' : ''}`}>
                        <div className="detail-image-label after">
                          <CheckCircle size={14} /> หลังซ่อม
                        </div>
                        <img
                          src={`http://localhost:5000${detailTask.image_after.replace(/\\/g, '/').replace('//', '/')}`}
                          alt="หลังซ่อม"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="detail-section">
                <div className="detail-actions">
                  {detailTask.status === 'pending' && (
                    <button
                      className="detail-btn primary"
                      onClick={() => updateTaskStatus(detailTask.id, 'in_progress')}
                    >
                      <Wrench size={16} /> รับงาน (เริ่มซ่อม)
                    </button>
                  )}

                  {detailTask.status === 'in_progress' && (
                    <>
                      <button
                        className="detail-btn warning"
                        onClick={() => updateTaskStatus(detailTask.id, 'waiting_parts')}
                      >
                        <Package size={16} /> รอวัสดุ
                      </button>
                      <button
                        className="detail-btn success"
                        onClick={() => updateTaskStatus(detailTask.id, 'completed')}
                      >
                        <CheckCircle size={16} /> ทำเสร็จแล้ว
                      </button>
                    </>
                  )}

                  {detailTask.status === 'waiting_parts' && (
                    <>
                      <button
                        className="detail-btn primary"
                        onClick={() => updateTaskStatus(detailTask.id, 'in_progress')}
                      >
                        <Wrench size={16} /> ดำเนินการต่อ
                      </button>
                      <button
                        className="detail-btn success"
                        onClick={() => updateTaskStatus(detailTask.id, 'completed')}
                      >
                        <CheckCircle size={16} /> ทำเสร็จแล้ว
                      </button>
                    </>
                  )}

                  {detailTask.status === 'completed' && (
                    <div className="detail-btn disabled">
                      <CheckCircle size={16} /> งานเสร็จสมบูรณ์
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Upload Modal ===================== */}
      {selectedTask && (
        <div className="modal-overlay" onClick={closeUploadModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>อัปโหลดรูปภาพหลังซ่อม</h2>
            <p>กรุณาถ่ายรูปหลังจากซ่อมเสร็จเพื่อบันทึกหลักฐาน</p>

            {(() => {
              const task = tasks.find(t => t.id === selectedTask);
              return task?.image ? (
                <div className="comparison-images">
                  <div className="before-image-section">
                    <span className="image-label" style={{ color: '#d97706', background: '#fffbeb' }}>
                      <Camera size={14} style={{ marginRight: '5px' }} /> รูปก่อนซ่อม
                    </span>
                    <img
                      src={`http://localhost:5000${task.image.replace(/\\/g, '/').replace('//', '/')}`}
                      alt="ก่อนซ่อม"
                      className="task-image-preview"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                </div>
              ) : null;
            })()}

            <div style={{ marginBottom: '15px' }}>
              <label className="repair-textarea-label">รายละเอียดการซ่อม:</label>
              <textarea
                value={repairDetail}
                onChange={(e) => setRepairDetail(e.target.value)}
                placeholder="ระบุสิ่งที่ได้ดำเนินการซ่อม..."
                className="repair-textarea"
              />
            </div>

            <div className="image-upload-area">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                id="image-upload"
                style={{ display: 'none' }}
              />
              <label htmlFor="image-upload" className="upload-label">
                {imagePreview ? (
                  <div>
                    <span className="image-label">
                      <CheckCircle size={14} style={{ marginRight: '5px' }} /> รูปหลังซ่อม (ใหม่)
                    </span>
                    <img src={imagePreview} alt="Preview" className="image-preview" />
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <div className="upload-icon"><Upload size={32} /></div>
                    <div>คลิกเพื่ออัปโหลดรูปหลังซ่อม</div>
                    <div className="upload-hint">รองรับ JPG, PNG (สูงสุด 5MB)</div>
                  </div>
                )}
              </label>
            </div>

            <div className="modal-actions">
              <button onClick={closeUploadModal} className="btn btn-secondary" disabled={uploading}>
                ยกเลิก
              </button>
              <button
                onClick={handleCompleteTask}
                className="btn btn-primary"
                disabled={!imageFile || uploading}
              >
                {uploading ? 'กำลังบันทึก...' : 'บันทึกงานเสร็จ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTasks;