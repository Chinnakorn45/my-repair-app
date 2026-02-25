import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import './Task.css';
import {
  Clock, Wrench, CheckCircle, MapPin, User, ClipboardList,
  AlertCircle, Briefcase, ChevronRight, Save, X, Calendar,
  Hash, Search, Camera, Inbox, FileCheck, Trash2, Edit
} from 'lucide-react';
import { formatThaiDate } from '../../utils/dateUtils';
import API_URL from '../../config/api';

// Normalize image path from DB into a full URL
const getImageUrl = (path) => {
  if (!path) return null;
  let cleaned = path.replace(/\\/g, '/');
  if (cleaned.includes('uploads/')) {
    cleaned = cleaned.substring(cleaned.indexOf('uploads/'));
  }
  const normalized = cleaned.startsWith('/') ? cleaned : '/' + cleaned;
  return `${API_URL}${normalized}`;
};

function Task() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, completed: 0, pending_approval: 0, total: 0 });
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Detail modal
  const [detailTask, setDetailTask] = useState(null);

  // Action modals
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Assignment/Repair states
  const [assignmentType, setAssignmentType] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [repairDetail, setRepairDetail] = useState('');
  const [repairStatus, setRepairStatus] = useState('completed');
  const [repairImage, setRepairImage] = useState(null);
  const [repairImagePreview, setRepairImagePreview] = useState(null);
  const [technicians, setTechnicians] = useState([]);

  // Edit Task State
  const [showEditModal, setShowEditModal] = useState(false);
  const [buildings, setBuildings] = useState([]);
  const [editFormData, setEditFormData] = useState({ description: '', building_id: '' });

  useEffect(() => {
    fetchTasks();
    fetchTechnicians();
    fetchBuildings();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('user_role');
      const userId = localStorage.getItem('user_id');

      let url = '';
      if (role === 'admin' || role === 'supervisor') {
        url = API_URL + '/api/admin/tasks?status=all';
      } else if (role === 'technician') {
        url = API_URL + '/api/technician/tasks';
      } else {
        url = `${API_URL}/api/repair-requests/${userId}`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error(`Failed to fetch tasks: ${response.status}`);

      const data = await response.json();
      if (Array.isArray(data)) {
        setTasks(data);
        const pending = data.filter(t => t.status === 'pending').length;
        const inProgress = data.filter(t => t.status === 'in_progress').length;
        const completed = data.filter(t => t.status === 'completed').length;
        const pendingApproval = data.filter(t => t.status === 'pending_approval').length;
        setStats({ pending, in_progress: inProgress, completed, pending_approval: pendingApproval, total: data.length });
      } else {
        setTasks([]);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      setTasks([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchTechnicians = async () => {
    const role = localStorage.getItem('user_role');
    if (role !== 'admin' && role !== 'supervisor') return;
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URL + '/api/admin/technicians', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) setTechnicians(data);
      }
    } catch (error) {
      console.error('Error fetching technicians:', error);
    }
  };

  const fetchBuildings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URL + '/api/buildings', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBuildings(data);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const openEditModal = (task) => {
    setEditFormData({
      description: task.description,
      building_id: task.building_id || ''
    });
    setSelectedTask(task);
    setShowEditModal(true);
    setDetailTask(null); // Close detail modal
  };

  const handleSaveEdit = async () => {
    if (!editFormData.description.trim()) {
      return Swal.fire('แจ้งเตือน', 'กรุณาระบุรายละเอียดงาน', 'warning');
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/repair-requests/${selectedTask.request_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editFormData)
      });

      if (response.ok) {
        Swal.fire({ icon: 'success', title: 'แก้ไขสำเร็จ', timer: 1500, showConfirmButton: false });
        setShowEditModal(false);
        fetchTasks();
      } else {
        const data = await response.json();
        Swal.fire('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถแก้ไขได้', 'error');
      }
    } catch (error) {
      console.error('Edit error:', error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
  };

  const handleSaveRepair = async () => {
    if (!repairDetail.trim()) return Swal.fire('แจ้งเตือน', 'กรุณากรอกรายละเอียดการซ่อม', 'warning');

    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('request_id', selectedTask.request_id);
    formData.append('repair_detail', repairDetail);
    formData.append('repair_status', repairStatus);
    if (repairImage) {
      formData.append('repair_image', repairImage);
    }

    try {
      const response = await fetch(API_URL + '/api/repairs', {
        method: 'POST',
        headers: {
          // 'Content-Type': 'multipart/form-data', // Fetch automatically sets this for FormData
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      if (response.ok) {
        Swal.fire({ icon: 'success', title: 'บันทึกสำเร็จ', timer: 1500, showConfirmButton: false });
        setShowRepairModal(false);
        setDetailTask(null);
        fetchTasks();
      } else {
        const errorData = await response.json();
        Swal.fire('เกิดข้อผิดพลาด', errorData.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
      }
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    }
  };

  const handleRepairImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setRepairImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setRepairImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAssignTask = async () => {
    if (!assignmentType) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกประเภทการมอบหมาย', 'warning');
    if (!selectedTechnician) return Swal.fire('แจ้งเตือน', 'กรุณาระบุผู้รับผิดชอบ', 'warning');

    try {
      const token = localStorage.getItem('token');
      const body = { is_external: assignmentType === 'external' };
      if (assignmentType === 'technician') {
        body.technician_id = selectedTechnician;
      } else {
        body.external_agency = selectedTechnician;
      }

      const response = await fetch(`${API_URL}/api/repair-requests/${selectedTask.request_id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        Swal.fire({ icon: 'success', title: 'มอบหมายสำเร็จ', timer: 1500, showConfirmButton: false });
        setShowAssignModal(false);
        setDetailTask(null);
        fetchTasks();
      } else {
        const data = await response.json();
        Swal.fire('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถมอบหมายงานได้', 'error');
      }
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    }
  };

  const getStatusText = (status) => {
    const map = {
      'pending': 'รอดำเนินการ',
      'in_progress': 'กำลังดำเนินการ',
      'completed': 'เสร็จสิ้น',
      'pending_approval': 'รออนุมัติ'
    };
    return map[status] || status;
  };

  const handleDeleteTask = async (task) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ',
      html: `<p>ต้องการลบงาน <strong>#${task.request_id}</strong> ใช่หรือไม่?</p><p style="color:#ef4444;font-size:13px">การลบจะไม่สามารถย้อนกลับได้</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'ลบรายการ',
      cancelButtonText: 'ยกเลิก'
    });

    if (!result.isConfirmed) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/repair-requests/${task.request_id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        Swal.fire({ icon: 'success', title: 'ลบสำเร็จ', timer: 1500, showConfirmButton: false });
        setDetailTask(null);
        fetchTasks();
      } else {
        const data = await response.json();
        Swal.fire('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถลบได้', 'error');
      }
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
  };

  const getFilteredTasks = () => {
    let filtered = tasks;
    if (filterStatus !== 'all') filtered = filtered.filter(t => t.status === filterStatus);
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(t =>
        (t.description && t.description.toLowerCase().includes(term)) ||
        (t.request_id && String(t.request_id).includes(term)) ||
        (t.location_name && t.location_name.toLowerCase().includes(term)) ||
        (t.reporter && t.reporter.toLowerCase().includes(term))
      );
    }
    return filtered;
  };

  const filteredTasks = getFilteredTasks();

  const openAssignModal = (task) => {
    setSelectedTask(task);
    setShowAssignModal(true);
    setAssignmentType('');
    setSelectedTechnician('');
    setDetailTask(null);
  };

  const openRepairModal = (task) => {
    setSelectedTask(task);
    setRepairDetail('');
    setRepairStatus('completed');
    setRepairImage(null);
    setRepairImagePreview(null);
    setShowRepairModal(true);
    setDetailTask(null);
  };

  if (loading) {
    return (
      <div className="task-page">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>กำลังโหลดรายการ...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="task-page">
      {/* Filter Tabs */}
      <div className="filter-tabs">
        <button className={`filter-tab ${filterStatus === 'all' ? 'active' : ''}`}
          onClick={() => setFilterStatus('all')}>
          <span className="tab-icon"><ClipboardList size={18} /></span>
          <span className="tab-text">ทั้งหมด</span>
          <span className="tab-badge">{stats.total}</span>
        </button>
        <button className={`filter-tab ${filterStatus === 'pending' ? 'active' : ''}`}
          onClick={() => setFilterStatus('pending')}>
          <span className="tab-icon"><Clock size={18} /></span>
          <span className="tab-text">รอดำเนินการ</span>
          <span className="tab-badge">{stats.pending}</span>
        </button>
        <button className={`filter-tab ${filterStatus === 'in_progress' ? 'active' : ''}`}
          onClick={() => setFilterStatus('in_progress')}>
          <span className="tab-icon"><Wrench size={18} /></span>
          <span className="tab-text">กำลังดำเนินการ</span>
          <span className="tab-badge">{stats.in_progress}</span>
        </button>
        <button className={`filter-tab ${filterStatus === 'pending_approval' ? 'active' : ''}`}
          onClick={() => setFilterStatus('pending_approval')}>
          <span className="tab-icon"><FileCheck size={18} /></span>
          <span className="tab-text">รออนุมัติ</span>
          <span className="tab-badge">{stats.pending_approval}</span>
        </button>
        <button className={`filter-tab ${filterStatus === 'completed' ? 'active' : ''}`}
          onClick={() => setFilterStatus('completed')}>
          <span className="tab-icon"><CheckCircle size={18} /></span>
          <span className="tab-text">เสร็จสิ้น</span>
          <span className="tab-badge">{stats.completed}</span>
        </button>
      </div>

      {/* Tasks Container */}
      <div className="tasks-container">
        <div className="tasks-header">
          <h2>
            {filterStatus === 'all' && 'จัดการงานซ่อมทั้งหมด'}
            {filterStatus === 'pending' && 'งานรอดำเนินการ'}
            {filterStatus === 'in_progress' && 'งานกำลังดำเนินการ'}
            {filterStatus === 'pending_approval' && 'งานรออนุมัติ'}
            {filterStatus === 'completed' && 'งานเสร็จสิ้น'}
          </h2>
          <p>คลิกที่รายการเพื่อดูรายละเอียดและจัดการ</p>
        </div>

        <div className="tasks-content">
          {/* Search */}
          <div className="search-bar">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="ค้นหาตาม ID, รายละเอียด, สถานที่..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {filteredTasks.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon"><Inbox size={48} /></div>
              <div className="empty-text">ไม่พบรายการงานซ่อม</div>
            </div>
          ) : (
            <div className="tasks-grid">
              {filteredTasks.map((task) => (
                <div
                  key={task.request_id}
                  className="task-card"
                  onClick={() => setDetailTask(task)}
                >
                  <div className={`task-card-indicator ${task.status}`} />

                  {/* Thumbnail */}
                  {task.image_before_path && (
                    <div className="task-card-thumb">
                      <img
                        src={getImageUrl(task.image_before_path)}
                        alt=""
                        onError={(e) => e.target.parentElement.style.display = 'none'}
                      />
                    </div>
                  )}

                  <div className="task-card-body">
                    <div className="task-card-top">
                      <p className="task-card-desc">{task.description}</p>
                      <span className="task-card-id">#{task.request_id}</span>
                    </div>
                    <div className="task-card-meta">
                      <span className="task-card-meta-item">
                        <MapPin size={14} />
                        {task.location_name || 'ไม่ระบุสถานที่'}
                      </span>
                      <span className="task-card-meta-item">
                        <User size={14} />
                        {task.reporter || 'ไม่ระบุผู้แจ้ง'}
                      </span>
                      {task.technician_name && (
                        <span className={`task-card-assigned ${task.is_external ? 'external' : ''}`}>
                          <Wrench size={12} />
                          {task.is_external ? `ภายนอก: ${task.technician_name}` : task.technician_name}
                        </span>
                      )}
                      <span className="task-card-meta-item">
                        <Calendar size={14} />
                        {formatThaiDate(task.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="task-card-right">
                    <span className={`status-badge ${task.status}`}>
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
        <div className="task-detail-overlay" onClick={() => setDetailTask(null)}>
          <div className="task-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="task-detail-header">
              <h2><Wrench size={20} /> งาน #{detailTask.request_id}</h2>
              <button className="task-detail-close" onClick={() => setDetailTask(null)}>
                <X size={18} />
              </button>
            </div>

            <div className="task-detail-body">
              {/* Description */}
              <div className="task-detail-section">
                <div className="task-detail-section-title">รายละเอียด</div>
                <div className="task-detail-description">{detailTask.description}</div>
              </div>

              {/* Meta */}
              <div className="task-detail-section">
                <div className="task-detail-section-title">ข้อมูลงาน</div>
                <div className="task-detail-meta-grid">
                  <div className="task-detail-meta-item">
                    <div className="task-detail-meta-icon id-icon"><Hash size={18} /></div>
                    <div>
                      <div className="task-detail-meta-label">รหัสงาน</div>
                      <div className="task-detail-meta-value">#{detailTask.request_id}</div>
                    </div>
                  </div>
                  <div className="task-detail-meta-item">
                    <div className="task-detail-meta-icon status-icon"><CheckCircle size={18} /></div>
                    <div>
                      <div className="task-detail-meta-label">สถานะ</div>
                      <div className="task-detail-meta-value">{getStatusText(detailTask.status)}</div>
                    </div>
                  </div>
                  <div className="task-detail-meta-item">
                    <div className="task-detail-meta-icon location"><MapPin size={18} /></div>
                    <div>
                      <div className="task-detail-meta-label">สถานที่</div>
                      <div className="task-detail-meta-value">{detailTask.location_name || 'ไม่ระบุสถานที่'}</div>
                    </div>
                  </div>
                  <div className="task-detail-meta-item">
                    <div className="task-detail-meta-icon date"><Calendar size={18} /></div>
                    <div>
                      <div className="task-detail-meta-label">วันที่แจ้ง</div>
                      <div className="task-detail-meta-value">
                        {formatThaiDate(detailTask.created_at)}
                      </div>
                    </div>
                  </div>
                  <div className="task-detail-meta-item">
                    <div className="task-detail-meta-icon user-icon"><User size={18} /></div>
                    <div>
                      <div className="task-detail-meta-label">ผู้แจ้ง</div>
                      <div className="task-detail-meta-value">{detailTask.reporter || 'ไม่ระบุผู้แจ้ง'}</div>
                    </div>
                  </div>
                  {detailTask.technician_name && (
                    <div className="task-detail-meta-item">
                      <div className="task-detail-meta-icon tech-icon"><Wrench size={18} /></div>
                      <div>
                        <div className="task-detail-meta-label">{detailTask.is_external ? 'หน่วยงานภายนอก' : 'ช่างที่รับผิดชอบ'}</div>
                        <div className="task-detail-meta-value">{detailTask.technician_name}</div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Images */}
              {(detailTask.image_before_path || detailTask.image_after) && (
                <div className="task-detail-section">
                  <div className="task-detail-section-title">รูปภาพ</div>
                  <div className="task-detail-images">
                    {detailTask.image_before_path && (
                      <div className={`task-detail-image-card ${!detailTask.image_after ? 'single' : ''}`}>
                        <div className="task-detail-image-label before">
                          <Camera size={14} /> ก่อนซ่อม
                        </div>
                        <img
                          src={getImageUrl(detailTask.image_before_path)}
                          alt="ก่อนซ่อม"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}
                    {detailTask.image_after && (
                      <div className={`task-detail-image-card ${!detailTask.image_before_path ? 'single' : ''}`}>
                        <div className="task-detail-image-label after">
                          <CheckCircle size={14} /> หลังซ่อม
                        </div>
                        <img
                          src={getImageUrl(detailTask.image_after)}
                          alt="หลังซ่อม"
                          onError={(e) => e.target.style.display = 'none'}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="task-detail-section">
                <div className="task-detail-actions">
                  {detailTask.status === 'pending' && (
                    <button className="task-detail-btn primary" onClick={() => openAssignModal(detailTask)}>
                      <ChevronRight size={16} /> มอบหมายงาน
                    </button>
                  )}

                  {detailTask.status === 'in_progress' && (
                    <>
                      {detailTask.assigned_to && !detailTask.is_external ? (
                        <button className="task-detail-btn external" onClick={() => {
                          setSelectedTask(detailTask);
                          setShowAssignModal(true);
                          setAssignmentType('external');
                          setSelectedTechnician('');
                          setDetailTask(null);
                        }}>
                          <Briefcase size={16} /> มอบหมายภายนอก
                        </button>
                      ) : (
                        <button className="task-detail-btn success" onClick={() => openRepairModal(detailTask)}>
                          <Save size={16} /> บันทึกผล
                        </button>
                      )}
                    </>
                  )}

                  {detailTask.status === 'completed' && (
                    <div className="task-detail-btn disabled">
                      <CheckCircle size={16} /> งานเสร็จสมบูรณ์
                    </div>
                  )}

                  {detailTask.status === 'pending_approval' && (
                    <button className="task-detail-btn success" onClick={() => openRepairModal(detailTask)}>
                      <FileCheck size={16} /> อนุมัติปิดงาน
                    </button>
                  )}

                  {/* Delete button - always visible */}
                  <div style={{ flex: 1, display: 'flex', gap: '10px' }}>
                    {/* Edit Button - Visible for Admin/Supervisor */}
                    {['admin', 'supervisor'].includes(localStorage.getItem('user_role')) && (
                      <button className="task-detail-btn" style={{ background: '#f59e0b', color: 'white' }} onClick={() => openEditModal(detailTask)}>
                        <Edit size={16} /> แก้ไข
                      </button>
                    )}

                    <button className="task-detail-btn danger" onClick={() => handleDeleteTask(detailTask)}>
                      <Trash2 size={16} /> ลบรายการ
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Repair Result Modal ===================== */}
      {showRepairModal && selectedTask && (
        <div className="task-modal-overlay" onClick={() => setShowRepairModal(false)}>
          <div className="task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <div>
                <h2>บันทึกผลการซ่อม</h2>
                <p>งานเลขที่: <strong>#{selectedTask.request_id}</strong></p>
              </div>
              <button className="task-modal-close" onClick={() => setShowRepairModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="task-form-group">
              <label className="task-form-label">รายละเอียดการซ่อม</label>
              <textarea
                value={repairDetail}
                onChange={(e) => setRepairDetail(e.target.value)}
                placeholder="ระบุรายละเอียดการซ่อม..."
                className="task-form-textarea"
              />
            </div>

            <div className="task-form-group">
              <label className="task-form-label">รูปภาพหลังซ่อม (ถ้ามี)</label>
              <div className="repair-image-upload-container">
                <input
                  type="file"
                  id="repair-image-upload"
                  accept="image/*"
                  onChange={handleRepairImageChange}
                  hidden
                />
                <label htmlFor="repair-image-upload" className="repair-image-upload-label">
                  <Camera size={20} />
                  <span>{repairImage ? 'เปลี่ยนรูปภาพ' : 'เพิ่มรูปภาพ'}</span>
                </label>
                {repairImagePreview && (
                  <div className="repair-image-preview">
                    <img src={repairImagePreview} alt="Preview" />
                    <button
                      className="remove-image-btn"
                      onClick={() => {
                        setRepairImage(null);
                        setRepairImagePreview(null);
                        document.getElementById('repair-image-upload').value = '';
                      }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="task-form-group">
              <label className="task-form-label">สถานะงาน</label>
              <select
                value={repairStatus}
                onChange={(e) => setRepairStatus(e.target.value)}
                className="task-form-select"
                disabled
              >
                <option value="completed">เสร็จสิ้น (Completed)</option>
              </select>
            </div>

            <div className="task-modal-actions">
              <button className="task-modal-btn secondary" onClick={() => setShowRepairModal(false)}>ยกเลิก</button>
              <button className="task-modal-btn success" onClick={handleSaveRepair}>บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Assign Modal ===================== */}
      {showAssignModal && selectedTask && (
        <div className="task-modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <div>
                <h2>มอบหมายงาน</h2>
                <p>งานเลขที่: <strong>#{selectedTask.request_id}</strong></p>
              </div>
              <button className="task-modal-close" onClick={() => setShowAssignModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="task-form-group">
              <label className="task-form-label">มอบหมายให้</label>
              <div className="task-assign-types">
                <label className={`task-assign-option ${assignmentType === 'technician' ? 'active' : ''}`}>
                  <input
                    type="radio" name="assignType" value="technician"
                    checked={assignmentType === 'technician'}
                    onChange={(e) => { setAssignmentType(e.target.value); setSelectedTechnician(''); }}
                  />
                  <User size={20} />
                  <span>ช่างเทคนิค</span>
                </label>
                <label className={`task-assign-option ${assignmentType === 'external' ? 'active' : ''}`}>
                  <input
                    type="radio" name="assignType" value="external"
                    checked={assignmentType === 'external'}
                    onChange={(e) => { setAssignmentType(e.target.value); setSelectedTechnician(''); }}
                  />
                  <Briefcase size={20} />
                  <span>หน่วยงานภายนอก</span>
                </label>
              </div>
            </div>

            {assignmentType === 'technician' && (
              <div className="task-form-group task-fade-in">
                <label className="task-form-label">เลือกช่าง</label>
                <select
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="task-form-select"
                >
                  <option value="">-- เลือกช่าง --</option>
                  {technicians.map(tech => (
                    <option key={tech.id} value={tech.id}>{tech.name}</option>
                  ))}
                </select>
              </div>
            )}

            {assignmentType === 'external' && (
              <div className="task-form-group task-fade-in">
                <label className="task-form-label">ชื่อหน่วยงานภายนอก</label>
                <input
                  type="text"
                  value={selectedTechnician}
                  onChange={(e) => setSelectedTechnician(e.target.value)}
                  className="task-form-input"
                  placeholder="ระบุชื่อบริษัท/ร้าน"
                />
              </div>
            )}

            <div className="task-modal-actions">
              <button className="task-modal-btn secondary" onClick={() => setShowAssignModal(false)}>ยกเลิก</button>
              <button className="task-modal-btn primary" onClick={handleAssignTask}>ยืนยันการมอบหมาย</button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== Edit Task Modal ===================== */}
      {showEditModal && selectedTask && (
        <div className="task-modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="task-modal" onClick={(e) => e.stopPropagation()}>
            <div className="task-modal-header">
              <div>
                <h2>แก้ไขงานซ่อม</h2>
                <p>งานเลขที่: <strong>#{selectedTask.request_id}</strong></p>
              </div>
              <button className="task-modal-close" onClick={() => setShowEditModal(false)}>
                <X size={18} />
              </button>
            </div>

            <div className="task-form-group">
              <label className="task-form-label">สถานที่</label>
              <select
                className="task-form-select"
                value={editFormData.building_id}
                onChange={(e) => setEditFormData({ ...editFormData, building_id: e.target.value })}
              >
                <option value="">-- เลือกสถานที่ --</option>
                {buildings.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>

            <div className="task-form-group">
              <label className="task-form-label">รายละเอียด</label>
              <textarea
                className="task-form-textarea"
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                rows={4}
              />
            </div>

            <div className="task-modal-actions">
              <button className="task-modal-btn secondary" onClick={() => setShowEditModal(false)}>ยกเลิก</button>
              <button className="task-modal-btn primary" onClick={handleSaveEdit}>บันทึกการแก้ไข</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Task;