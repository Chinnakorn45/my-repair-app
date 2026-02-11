import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  ClipboardList, Clock, Wrench, Package, CheckCircle,
  MapPin, Calendar, Camera, Upload, Inbox, ImageIcon
} from 'lucide-react';
import './Mytasks.css'; // Assuming you might have created this or need it, otherwise index.css is fine.
// Verify styles? The file view didn't show styles import in the top part but line 2 says import './Mytasks.css'?
// Wait, step 994 line 2 says import Swal... line 3... nothing about CSS?
// Ah, the file view in step 994 lines 1-7 don't show CSS import.
// But earlier in task.md I said "Check and fix Mytasks.jsx styles".
// I will assume inline styles or global styles for now, but I should probably import `Mytasks.css` if it exists.
// Checking `list_dir` in step 939... `Mytasks.css` does NOT exist in `components/pages`?
// `pages` dir listing in 939 was just "pages isDir".
// I didn't list pages.
// I will omit CSS import if not sure, or better, include it if I plan to create it.
// The user didn't ask for Mytasks.css, but I modernized it.
// I will stick to what was likely there. content in 994 line 1-6 has no CSS import.

const MyTasks = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedTask, setSelectedTask] = useState(null);
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

  const closeModal = () => {
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
          <span className="tab-icon"><ClipboardList size={20} /></span>
          <span className="tab-text">ทั้งหมด</span>
          <span className="tab-badge">{tasks.length}</span>
        </button>
        <button
          className={`filter-tab ${filterStatus === 'pending' ? 'active' : ''}`}
          onClick={() => setFilterStatus('pending')}
        >
          <span className="tab-icon"><Clock size={20} /></span>
          <span className="tab-text">รอรับงาน</span>
          <span className="tab-badge">{tasks.filter(t => t.status === 'pending').length}</span>
        </button>
        <button
          className={`filter-tab ${filterStatus === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilterStatus('in_progress')}
        >
          <span className="tab-icon"><Wrench size={20} /></span>
          <span className="tab-text">กำลังซ่อม</span>
          <span className="tab-badge">{tasks.filter(t => t.status === 'in_progress').length}</span>
        </button>
        <button
          className={`filter-tab ${filterStatus === 'waiting_parts' ? 'active' : ''}`}
          onClick={() => setFilterStatus('waiting_parts')}
        >
          <span className="tab-icon"><Package size={20} /></span>
          <span className="tab-text">รอวัสดุ</span>
          <span className="tab-badge">{tasks.filter(t => t.status === 'waiting_parts').length}</span>
        </button>
        <button
          className={`filter-tab ${filterStatus === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterStatus('completed')}
        >
          <span className="tab-icon"><CheckCircle size={20} /></span>
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
          <p>รายการงานซ่อมบำรุง</p>
        </div>
        <div className="tasks-content">
          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Inbox size={48} /></div>
              <div className="empty-text">
                ไม่พบรายการงานซ่อม
              </div>
            </div>
          ) : (
            <div className="tasks-grid">
              {filteredTasks.map((task) => (
                <div key={task.id} className="task-card">
                  {task.image && (
                    <div className="task-image">
                      <div className="image-label"><Camera size={14} style={{ marginRight: '5px' }} /> รูปก่อนซ่อม</div>
                      <img
                        src={`http://localhost:5000${task.image}`}
                        alt="งานซ่อม"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}

                  {task.image_after && (
                    <div className="task-image">
                      <div className="image-label"><CheckCircle size={14} style={{ marginRight: '5px' }} /> รูปหลังซ่อม</div>
                      <img
                        src={`http://localhost:5000${task.image_after}`}
                        alt="หลังซ่อม"
                        onError={(e) => e.target.style.display = 'none'}
                      />
                    </div>
                  )}

                  <div className="task-header">
                    <div className="task-title-row">
                      <h3 className="task-title">{task.description}</h3>
                    </div>
                    <span className={`status-badge ${getStatusClass(task.status)}`}>
                      {getStatusText(task.status)}
                    </span>
                  </div>

                  <div className="task-info">
                    <div className="task-info-item">
                      <span className="icon"><MapPin size={16} /></span>
                      <span className="text">{task.building_name || 'ไม่ระบุสถานที่'}</span>
                    </div>
                    <div className="task-info-item time">
                      <span className="icon"><Calendar size={16} /></span>
                      <span className="text">
                        {new Date(task.created_at).toLocaleString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="task-actions">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => updateTaskStatus(task.id, 'in_progress')}
                        className="task-btn primary"
                      >
                        รับงาน (เริ่มซ่อม)
                      </button>
                    )}

                    {task.status === 'in_progress' && (
                      <>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'waiting_parts')}
                          className="task-btn warning"
                          style={{ backgroundColor: '#f59e0b', color: 'white', marginRight: '8px' }}
                        >
                          รอวัสดุ
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="task-btn success"
                        >
                          ทำเสร็จแล้ว
                        </button>
                      </>
                    )}

                    {task.status === 'waiting_parts' && (
                      <>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'in_progress')}
                          className="task-btn primary"
                          style={{ marginRight: '8px' }}
                        >
                          ดำเนินการต่อ
                        </button>
                        <button
                          onClick={() => updateTaskStatus(task.id, 'completed')}
                          className="task-btn success"
                        >
                          ทำเสร็จแล้ว
                        </button>
                      </>
                    )}

                    {task.status === 'completed' && (
                      <div className="task-btn disabled">
                        งานเสร็จสมบูรณ์
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal อัปโหลดรูป */}
      {selectedTask && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>อัปโหลดรูปภาพหลังซ่อม</h2>
            <p>กรุณาถ่ายรูปหลังจากซ่อมเสร็จเพื่อบันทึกหลักฐาน</p>

            {(() => {
              const task = tasks.find(t => t.id === selectedTask);
              return task?.image ? (
                <div className="comparison-images">
                  <div className="before-image-section">
                    <span className="image-label"><Camera size={14} style={{ marginRight: '5px' }} /> รูปก่อนซ่อม</span>
                    <img
                      src={`http://localhost:5000${task.image}`}
                      alt="ก่อนซ่อม"
                      className="task-image-preview"
                      onError={(e) => e.target.style.display = 'none'}
                    />
                  </div>
                </div>
              ) : null;
            })()}

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>รายละเอียดการซ่อม:</label>
              <textarea
                value={repairDetail}
                onChange={(e) => setRepairDetail(e.target.value)}
                placeholder="ระบุสิ่งที่ได้ดำเนินการซ่อม..."
                style={{
                  width: '100%',
                  minHeight: '80px',
                  padding: '10px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                  fontFamily: 'inherit'
                }}
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
                    <span className="image-label"><CheckCircle size={14} style={{ marginRight: '5px' }} /> รูปหลังซ่อม (ใหม่)</span>
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
              <button onClick={closeModal} className="btn btn-secondary" disabled={uploading}>
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