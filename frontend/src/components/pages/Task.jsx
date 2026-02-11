import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import './Task.css';
import {
  Clock, Wrench, CheckCircle, MapPin, User,
  AlertCircle, Briefcase, ChevronRight, Save
} from 'lucide-react';

function Task() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, completed: 0, total: 0 });

  // Modal states
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  // Assignment/Repair states
  const [assignmentType, setAssignmentType] = useState('');
  const [selectedTechnician, setSelectedTechnician] = useState('');
  const [repairDetail, setRepairDetail] = useState('');
  const [repairStatus, setRepairStatus] = useState('completed');
  const [technicians, setTechnicians] = useState([]);

  useEffect(() => {
    fetchTasks();
    fetchTechnicians();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const role = localStorage.getItem('user_role');
      const userId = localStorage.getItem('user_id');

      let url = '';
      if (role === 'admin' || role === 'supervisor') {
        url = 'http://localhost:5000/api/admin/tasks?status=all';
      } else if (role === 'technician') {
        url = 'http://localhost:5000/api/technician/tasks';
      } else {
        url = `http://localhost:5000/api/repair-requests/${userId}`;
      }

      console.log(`Fetching tasks for role: ${role} from ${url}`);

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setTasks(data);

        // Calculate stats locally based on fetched data
        const pending = data.filter(t => t.status === 'pending').length;
        const inProgress = data.filter(t => t.status === 'in_progress').length;
        const completed = data.filter(t => t.status === 'completed').length;
        setStats({ pending, in_progress: inProgress, completed, total: data.length });
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
      const response = await fetch('http://localhost:5000/api/admin/technicians', {
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

  const handleSaveRepair = async () => {
    if (!repairDetail.trim()) return Swal.fire('แจ้งเตือน', 'กรุณากรอกรายละเอียดการซ่อม', 'warning');

    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:5000/api/repairs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          request_id: selectedTask.request_id,
          repair_detail: repairDetail,
          repair_status: repairStatus
        })
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'บันทึกสำเร็จ',
          text: 'บันทึกข้อมูลการซ่อมเรียบร้อยแล้ว',
          timer: 1500,
          showConfirmButton: false
        });
        setShowRepairModal(false);
        fetchTasks();
      }
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  const handleAssignTask = async () => {
    if (!assignmentType) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกประเภทการมอบหมาย', 'warning');
    if (!selectedTechnician) return Swal.fire('แจ้งเตือน', 'กรุณาระบุผู้รับผิดชอบ', 'warning');

    try {
      const token = localStorage.getItem('token');
      const body = {
        is_external: assignmentType === 'external',
      };

      if (assignmentType === 'technician') {
        body.technician_id = selectedTechnician;
      } else {
        body.external_agency = selectedTechnician;
      }

      const response = await fetch(`http://localhost:5000/api/repair-requests/${selectedTask.request_id}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'มอบหมายงานเรียบร้อยแล้ว',
          timer: 1500,
          showConfirmButton: false
        });
        setShowAssignModal(false);
        fetchTasks();
      } else {
        const data = await response.json();
        Swal.fire('เกิดข้อผิดพลาด', data.message || 'ไม่สามารถมอบหมายงานได้', 'error');
      }
    } catch (error) {
      console.error('Error assigning task:', error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'warning';
      case 'in_progress': return 'info';
      case 'completed': return 'success';
      default: return 'secondary';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'pending': return 'รอดำเนินการ';
      case 'in_progress': return 'กำลังดำเนินการ';
      case 'completed': return 'เสร็จสิ้น';
      default: return status;
    }
  };

  return (
    <div className="task-container">
      <div className="task-header">
        <div className="header-title">
          <Briefcase size={28} className="text-primary" />
          <h1>จัดการงานซ่อม</h1>
        </div>
        <p className="header-subtitle">ติดตามและจัดการรายการแจ้งซ่อมทั้งหมด</p>
      </div>

      <div className="task-stats-grid">
        <div className="task-stat-card warning">
          <div className="stat-icon-bg"><Clock size={24} /></div>
          <div className="stat-details">
            <span>รอดำเนินการ</span>
            <strong>{stats.pending}</strong>
          </div>
        </div>
        <div className="task-stat-card info">
          <div className="stat-icon-bg"><Wrench size={24} /></div>
          <div className="stat-details">
            <span>กำลังดำเนินการ</span>
            <strong>{stats.in_progress}</strong>
          </div>
        </div>
        <div className="task-stat-card success">
          <div className="stat-icon-bg"><CheckCircle size={24} /></div>
          <div className="stat-details">
            <span>เสร็จสิ้น</span>
            <strong>{stats.completed}</strong>
          </div>
        </div>
      </div>

      <div className="task-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>กำลังโหลดรายการ...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <AlertCircle size={48} />
            <h3>ไม่พบรายการแจ้งซ่อม</h3>
          </div>
        ) : (
          tasks.map(task => (
            <div key={task.request_id} className="task-card">
              <div className="task-status-bar" data-status={task.status}></div>
              <div className="task-content">
                <div className="task-main-info">
                  <div className="task-id">#{task.request_id}</div>
                  <h3 className="task-title">{task.description}</h3>

                  <div className="task-meta">
                    <div className="meta-item">
                      <MapPin size={16} />
                      <span>{task.building_id ? `ตึกรหัส ${task.building_id}` : 'ไม่ระบุตึก'}</span>
                    </div>
                    <div className="meta-item">
                      <User size={16} />
                      <span>ผู้แจ้ง: {task.user_id}</span>
                    </div>
                  </div>
                </div>

                <div className="task-side-info">
                  <span className={`status-badge ${getStatusColor(task.status)}`}>
                    {getStatusText(task.status)}
                  </span>

                  <div className="task-actions">
                    {task.status === 'pending' && (
                      <button
                        className="btn-action primary"
                        onClick={() => {
                          setSelectedTask(task);
                          setShowAssignModal(true);
                          setAssignmentType('');
                          setSelectedTechnician('');
                        }}
                      >
                        มอบหมายงาน <ChevronRight size={16} />
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        className="btn-action success"
                        onClick={() => { setSelectedTask(task); setShowRepairModal(true); }}
                      >
                        <Save size={16} /> บันทึกผล
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal บันทึกผลการซ่อม */}
      {showRepairModal && (
        <div className="modal-overlay" onClick={() => setShowRepairModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>บันทึกผลการซ่อม</h2>
              <button className="close-btn" onClick={() => setShowRepairModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p className="modal-subtitle">งานเลขที่: <strong>#{selectedTask.request_id}</strong></p>

              <div className="form-group">
                <label>รายละเอียดการซ่อม</label>
                <textarea
                  placeholder="ระบุรายละเอียดการซ่อม..."
                  value={repairDetail}
                  onChange={(e) => setRepairDetail(e.target.value)}
                  className="modern-textarea"
                />
              </div>

              <div className="form-group">
                <label>สถานะงาน</label>
                <select
                  value={repairStatus}
                  onChange={(e) => setRepairStatus(e.target.value)}
                  className="modern-select"
                >
                  <option value="completed">เสร็จสิ้น (Completed)</option>
                  <option value="in_progress">ยังไม่เสร็จ (In Progress)</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowRepairModal(false)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleSaveRepair}>บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal มอบหมายงาน */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>มอบหมายงาน</h2>
              <button className="close-btn" onClick={() => setShowAssignModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>มอบหมายให้</label>
                <div className="assignment-type-selector">
                  <label className={`type-option ${assignmentType === 'technician' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="assignType"
                      value="technician"
                      checked={assignmentType === 'technician'}
                      onChange={(e) => {
                        setAssignmentType(e.target.value);
                        setSelectedTechnician('');
                      }}
                    />
                    <User size={18} />
                    <span>ช่างเทคนิค</span>
                  </label>
                  <label className={`type-option ${assignmentType === 'external' ? 'active' : ''}`}>
                    <input
                      type="radio"
                      name="assignType"
                      value="external"
                      checked={assignmentType === 'external'}
                      onChange={(e) => {
                        setAssignmentType(e.target.value);
                        setSelectedTechnician('');
                      }}
                    />
                    <Briefcase size={18} />
                    <span>หน่วยงานภายนอก</span>
                  </label>
                </div>
              </div>

              {assignmentType === 'technician' && (
                <div className="form-group fade-in">
                  <label>เลือกช่าง</label>
                  <select
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                    className="modern-select"
                  >
                    <option value="">-- เลือกช่าง --</option>
                    {technicians.map(tech => (
                      <option key={tech.id} value={tech.id}>{tech.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {assignmentType === 'external' && (
                <div className="form-group fade-in">
                  <label>ชื่อหน่วยงานภายนอก</label>
                  <input
                    type="text"
                    value={selectedTechnician}
                    onChange={(e) => setSelectedTechnician(e.target.value)}
                    className="modern-input"
                    placeholder="ระบุชื่อบริษัท/ร้าน"
                  />
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowAssignModal(false)}>ยกเลิก</button>
              <button className="btn-primary" onClick={handleAssignTask}>ยืนยันการมอบหมาย</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Task;