import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Sidebar from './Sidebar';
import TaskList from './TaskList';
import Notifications from "./pages/AnnouncementFeed";
import Task from "./pages/Task";
import Reports from './pages/Reports';
import CustomReport from './pages/CustomReport';
import Profile from './pages/Profile';
import UserGuide from './pages/UserGuide';



import './SupervisorDashboard.css';
import {
  Menu, Bell, Clock, Wrench, CheckCircle, X,
  BarChart2, Users, FileText, User, LayoutDashboard, ClipboardList, TrendingUp, Save, BookOpen
} from 'lucide-react';

function SupervisorDashboard({ userId, onLogout }) {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    in_progress: 0,
    pending_approval: 0,
    completed: 0
  });
  const [teamWorkload, setTeamWorkload] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showAssignmentSheet, setShowAssignmentSheet] = useState(false);

  // Repair Result Modal State
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [repairDetail, setRepairDetail] = useState('');
  const [repairStatus, setRepairStatus] = useState('completed');

  const [technicians, setTechnicians] = useState([]);
  const [selectedTechnicianId, setSelectedTechnicianId] = useState(null);
  const [assigning, setAssigning] = useState(false);
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('');

  // Get user role from localStorage
  const userRole = localStorage.getItem('user_role') || 'supervisor';

  useEffect(() => {
    fetchData();
    fetchPopup();

    // Fetch user name
    const fetchUserName = async () => {
      try {
        const token = localStorage.getItem('token');
        const uid = userId || localStorage.getItem('user_id');
        const res = await fetch(`http://localhost:5000/api/users/${uid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUserName(data.first_name || data.username);
        }
      } catch (e) { console.error(e); }
    };
    fetchUserName();
  }, [userId]);

  const fetchPopup = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/popup');
      const data = await res.json();

      if (data.active && data.image_url) {
        Swal.fire({
          title: data.text || 'ประกาศข่าวสาร',
          imageUrl: `http://localhost:5000${data.image_url}`,
          imageWidth: 600,
          imageAlt: 'Announcement',
          confirmButtonText: 'รับทราบ',
          width: 'auto',
          padding: '20px'
        });
      } else if (data.active && data.text) {
        Swal.fire({
          title: 'ประกาศข่าวสาร',
          text: data.text,
          icon: 'info',
          confirmButtonText: 'รับทราบ'
        });
      }
    } catch (err) {
      console.error("Error fetching popup:", err);
    }
  };

  const fetchData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      handleLogout();
      return;
    }
    try {
      await Promise.all([
        fetchStats(token),
        fetchTeamWorkload(token),
        fetchTasks(token),
        fetchTechnicians(token)
      ]);
    } finally {
      setLoading(false);
    }
  };

  const checkAuth = (response) => {
    if (response.status === 401) {
      handleLogout();
      throw new Error('Unauthorized');
    }
    return response;
  };

  const fetchStats = async (token) => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      checkAuth(response);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const fetchTeamWorkload = async (token) => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/team-workload', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      checkAuth(response);
      if (response.ok) {
        const data = await response.json();
        setTeamWorkload(data);
      }
    } catch (err) {
      console.error('Error fetching team workload:', err);
    }
  };

  const fetchTasks = async (token, statusOverride) => {
    const status = statusOverride ?? activeTab;
    try {
      const response = await fetch(`http://localhost:5000/api/admin/tasks?status=${status}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      checkAuth(response);
      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchTechnicians = async (token) => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/technicians', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      checkAuth(response);
      if (response.ok) {
        const data = await response.json();
        setTechnicians(data);
      }
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  };

  const handleAssignTask = async () => {
    if (!selectedTask || !selectedTechnicianId) return;

    setAssigning(true);
    const token = localStorage.getItem('token');
    const url = `http://localhost:5000/api/repair-requests/${selectedTask.request_id}/assign`;
    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ technician_id: selectedTechnicianId })
      });

      const contentType = response.headers.get('content-type');
      let data = null;
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        if (response.status === 404) {
          Swal.fire('ข้อผิดพลาด', 'ไม่พบ API มอบหมายงาน (404)\nกรุณารีสตาร์ท backend server แล้วลองใหม่', 'error');
          return;
        }
        throw new Error(text || `HTTP ${response.status}`);
      }

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: `มอบหมายงานให้ ${data.technician_name} สำเร็จ`,
          timer: 1500,
          showConfirmButton: false
        });
        setShowAssignmentSheet(false);
        setSelectedTask(null);
        setSelectedTechnicianId(null);
        fetchTasks(token, activeTab);
        fetchStats(token);
        fetchTeamWorkload(token);
      } else {
        Swal.fire('เกิดข้อผิดพลาด', data.message || 'เกิดข้อผิดพลาดในการมอบหมายงาน', 'error');
      }
    } catch (err) {
      console.error('Error assigning task:', err);
      Swal.fire('เกิดข้อผิดพลาด', err.message || 'ไม่สามารถมอบหมายงานได้', 'error');
    } finally {
      setAssigning(false);
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
        fetchTasks(token, activeTab);
        fetchStats(token);
      } else {
        const errData = await response.json();
        Swal.fire('เกิดข้อผิดพลาด', errData.message || 'ไม่สามารถบันทึกข้อมูลได้', 'error');
      }
    } catch (error) {
      console.error('Save repair error:', error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
    }
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'ออกจากระบบ?',
      text: "คุณต้องการออกจากระบบใช่หรือไม่?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'ใช่, ออกจากระบบ',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('token');
        localStorage.removeItem('user_role');
        if (onLogout) onLogout();
        else window.location.href = '/login';
      }
    });
  };

  return (
    <div className="supervisor-dashboard">
      {/* Unified Sidebar */}
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={handleLogout}
        userRole={userRole}
        userName={userName}
      />

      {/* Main Content */}
      <main className="main-content">
        {/* Header with Menu Toggle */}
        <div className="top-bar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={24} />
          </button>
          <h1 className="page-title">
            {activeMenu === 'dashboard' && <><LayoutDashboard size={28} className="icon-gap" /> Dashboard</>}
            {activeMenu === 'tasks' && <><ClipboardList size={28} className="icon-gap" /> จัดการงานซ่อม</>}
            {activeMenu === 'reports' && <><TrendingUp size={28} className="icon-gap" /> รายงาน</>}
            {activeMenu === 'notifications' && <><Bell size={28} className="icon-gap" /> การแจ้งเตือน</>}
            {activeMenu === 'profile' && <><User size={28} className="icon-gap" /> โปรไฟล์</>}
            {activeMenu === 'guide' && <><BookOpen size={28} className="icon-gap" /> คู่มือการใช้งาน</>}
          </h1>

        </div>

        <div className="container">
          {/* Dashboard View */}
          {activeMenu === 'dashboard' && (
            <>
              {/* Quick Overview Row */}
              <div className="overview-row">
                <div className="overview-total">
                  <div className="overview-total-inner">
                    <div className="overview-total-info">
                      <span className="overview-total-label">งานทั้งหมด</span>
                      <span className="overview-total-number">{stats.total || 0}</span>
                    </div>
                    <div className="overview-ring-wrapper">
                      <svg width="70" height="70" viewBox="0 0 70 70">
                        <circle cx="35" cy="35" r="28" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                        <circle cx="35" cy="35" r="28"
                          fill="none"
                          stroke={(() => {
                            const total = stats.total || 0;
                            const rate = total > 0 ? (stats.completed || 0) / total * 100 : 0;
                            return rate >= 70 ? '#10b981' : rate >= 40 ? '#f59e0b' : '#ef4444';
                          })()}
                          strokeWidth="6"
                          strokeDasharray={2 * Math.PI * 28}
                          strokeDashoffset={(() => {
                            const total = stats.total || 0;
                            const rate = total > 0 ? (stats.completed || 0) / total * 100 : 0;
                            return 2 * Math.PI * 28 - (rate / 100) * 2 * Math.PI * 28;
                          })()}
                          strokeLinecap="round"
                          transform="rotate(-90 35 35)"
                          style={{ transition: 'stroke-dashoffset 1s ease' }}
                        />
                        <text x="35" y="33" textAnchor="middle" className="ring-percent">
                          {(() => {
                            const total = stats.total || 0;
                            return total > 0 ? ((stats.completed || 0) / total * 100).toFixed(0) : 0;
                          })()}%
                        </text>
                        <text x="35" y="45" textAnchor="middle" className="ring-label">สำเร็จ</text>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stats Overview - 4 Cards */}
              <div className="stats-grid">
                <div className="stat-card stat-pending">
                  <div className="stat-content">
                    <div className="stat-info">
                      <div className="stat-label">รอมอบหมาย</div>
                      <div className="stat-number">{stats.pending}</div>
                    </div>
                    <div className="stat-icon-wrapper bg-warn-light">
                      <Clock size={24} className="text-warn" />
                    </div>
                  </div>
                  <div className="stat-bar" style={{ background: '#f59e0b' }}></div>
                </div>

                <div className="stat-card stat-progress">
                  <div className="stat-content">
                    <div className="stat-info">
                      <div className="stat-label">กำลังดำเนินการ</div>
                      <div className="stat-number">{stats.in_progress}</div>
                    </div>
                    <div className="stat-icon-wrapper bg-info-light">
                      <Wrench size={24} className="text-info" />
                    </div>
                  </div>
                  <div className="stat-bar" style={{ background: '#3b82f6' }}></div>
                </div>

                <div className="stat-card stat-done">
                  <div className="stat-content">
                    <div className="stat-info">
                      <div className="stat-label">เสร็จสิ้น</div>
                      <div className="stat-number">{stats.completed || 0}</div>
                    </div>
                    <div className="stat-icon-wrapper bg-success-light">
                      <CheckCircle size={24} className="text-success" />
                    </div>
                  </div>
                  <div className="stat-bar" style={{ background: '#10b981' }}></div>
                </div>
              </div>

              {/* Team Workload */}
              <div className="workload-section">
                <h3 className="section-title">
                  <Users size={20} className="mr-2" />
                  ภาระงานของทีมช่างปัจจุบัน
                </h3>
                {teamWorkload.length === 0 ? (
                  <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>ยังไม่มีข้อมูลทีมช่าง</p>
                ) : (
                  <div className="workload-list">
                    {teamWorkload.map((tech, idx) => (
                      <div key={idx} className="workload-item">
                        <div className="workload-tech-info">
                          <div className="workload-avatar" style={{
                            background: tech.tasks > 5 ? 'linear-gradient(135deg, #fecaca, #fca5a5)' :
                              tech.tasks > 0 ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)' :
                                'linear-gradient(135deg, #dcfce7, #bbf7d0)'
                          }}>
                            <span style={{
                              color: tech.tasks > 5 ? '#dc2626' : tech.tasks > 0 ? '#2563eb' : '#16a34a'
                            }}>{tech.name?.charAt(0) || '?'}</span>
                          </div>
                          <p className="tech-name">{tech.name}</p>
                        </div>
                        <div className="progress-bar-container">
                          <div
                            className="progress-bar"
                            style={{
                              width: `${Math.min((tech.tasks / 10) * 100, 100)}%`,
                              background: tech.tasks > 5
                                ? 'linear-gradient(90deg, #f87171, #ef4444)'
                                : tech.tasks > 0
                                  ? 'linear-gradient(90deg, #60a5fa, #3b82f6)'
                                  : 'linear-gradient(90deg, #34d399, #10b981)'
                            }}
                          ></div>
                        </div>
                        <p className="task-count">{tech.tasks} งาน</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Task Tabs - 3 tabs */}
              <div className="filter-tabs">
                <button
                  onClick={() => {
                    setActiveTab('pending');
                    fetchTasks(localStorage.getItem('token'), 'pending');
                  }}
                  className={`filter-tab ${activeTab === 'pending' ? 'active' : ''}`}
                >
                  <Clock size={16} />
                  <span className="tab-text">รอการมอบหมาย</span>
                  <span className="tab-badge">{stats.pending}</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('in_progress');
                    fetchTasks(localStorage.getItem('token'), 'in_progress');
                  }}
                  className={`filter-tab ${activeTab === 'in_progress' ? 'active' : ''}`}
                >
                  <Wrench size={16} />
                  <span className="tab-text">กำลังดำเนินการ</span>
                  <span className="tab-badge">{stats.in_progress}</span>
                </button>

              </div>

              {/* Task List */}
              <div className="task-list-container">
                {loading ? (
                  <div className="loading-message">
                    <div className="spinner"></div>
                    <p>กำลังโหลด...</p>
                  </div>
                ) : (
                  <TaskList
                    tasks={tasks}
                    hideActions={true}
                    onSelectTask={(task) => {
                      setSelectedTask(task);
                      setShowDetailModal(true);
                    }}
                  />
                )}
              </div>
            </>
          )}

          {/* ✅ แทนที่ Placeholder ด้วย Task Component จริง */}
          {activeMenu === 'tasks' && <Task />}

          {activeMenu === 'team' && (
            <div className="placeholder-content">
              <Users size={48} className="placeholder-icon-lg" />
              <h2>จัดการทีม</h2>
              <p>ฟีเจอร์นี้กำลังพัฒนา</p>
            </div>
          )}

          {activeMenu === 'reports' && <Reports />}
          {activeMenu === 'custom-report' && <CustomReport />}

          {/* ✅ Notifications Component */}
          {activeMenu === 'notifications' && <Notifications />}

          {/* ✅ Enabled Profile Page */}
          {activeMenu === 'profile' && <Profile userId={userId} />}
          {activeMenu === 'guide' && <UserGuide userRole="supervisor" />}
        </div>
      </main>

      {/* Task Detail Modal (Read Only) */}
      {showDetailModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="assignment-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-header">
              <h3 className="sheet-title">รายละเอียดงานซ่อม</h3>
              <button
                className="close-btn"
                onClick={() => setShowDetailModal(false)}
              >
                <X size={24} />
              </button>
            </div>

            <div className="task-info">
              <p className="task-info-text"><strong>รหัสงาน:</strong> #{selectedTask.request_id}</p>
              <p className="task-info-text"><strong>รายละเอียด:</strong> {selectedTask.description}</p>
              <p className="task-info-text"><strong>สถานที่:</strong> {selectedTask.location || selectedTask.location_name || '-'}</p>
              <p className="task-info-text"><strong>ผู้แจ้ง:</strong> {selectedTask.reporter}</p>
              <p className="task-info-text"><strong>สถานะ:</strong> {
                selectedTask.status === 'pending' ? 'รอรับเรื่อง' :
                  selectedTask.status === 'in_progress' ? 'กำลังดำเนินการ' :
                    selectedTask.status === 'pending_approval' ? 'รออนุมัติปิดงาน' : 'เสร็จสิ้น'
              }</p>
              {selectedTask.technician_name && (
                <p className="task-info-text"><strong>ช่างผู้รับผิดชอบ:</strong> {selectedTask.technician_name}</p>
              )}
            </div>

            {(selectedTask.image_before_path || selectedTask.image_url) && (
              <div className="image-section" style={{ marginTop: '15px' }}>
                <p><strong>รูปภาพแจ้งซ่อม:</strong></p>
                <img
                  src={(() => {
                    let path = selectedTask.image_url || selectedTask.image_before_path || '';
                    path = path.replace(/\\/g, '/');
                    if (path.includes('uploads/')) path = path.substring(path.indexOf('uploads/'));
                    else if (path.startsWith('/')) path = path.substring(1);
                    return `http://localhost:5000/${path}`;
                  })()}
                  alt="Before Repair"
                  style={{ width: '100%', borderRadius: '8px', marginTop: '5px' }}
                />
              </div>
            )}

            {selectedTask.image_after && (
              <div className="image-section" style={{ marginTop: '15px' }}>
                <p><strong>รูปภาพหลังซ่อม:</strong></p>
                <img
                  src={(() => {
                    let path = selectedTask.image_after || '';
                    path = path.replace(/\\/g, '/');
                    if (path.includes('uploads/')) path = path.substring(path.indexOf('uploads/'));
                    else if (path.startsWith('/')) path = path.substring(1);
                    return `http://localhost:5000/${path}`;
                  })()}
                  alt="After Repair"
                  style={{ width: '100%', borderRadius: '8px', marginTop: '5px' }}
                />
              </div>
            )}

            {selectedTask.repair_detail && (
              <div style={{ marginTop: '15px', padding: '10px', background: '#f8fafc', borderRadius: '8px' }}>
                <p><strong>รายละเอียดการซ่อม:</strong></p>
                <p>{selectedTask.repair_detail}</p>
              </div>
            )}

            <div style={{ marginTop: '20px', textAlign: 'right' }}>
              <button
                className="confirm-btn"
                onClick={() => setShowDetailModal(false)}
                style={{ width: 'auto', padding: '8px 20px' }}
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Repair Result Modal */}
      {showRepairModal && selectedTask && (
        <div className="modal-overlay" onClick={() => setShowRepairModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'white', padding: '20px', borderRadius: '12px', width: '90%', maxWidth: '500px' }}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold' }}>บันทึกผลการซ่อม</h2>
              <button onClick={() => setShowRepairModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '15px' }}>งานเลขที่: <strong>#{selectedTask.request_id}</strong></p>

              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>รายละเอียดการซ่อม</label>
                <textarea
                  placeholder="ระบุรายละเอียดการซ่อม..."
                  value={repairDetail}
                  onChange={(e) => setRepairDetail(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd', minHeight: '100px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>สถานะงาน</label>
                <select
                  value={repairStatus}
                  onChange={(e) => setRepairStatus(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #ddd' }}
                >
                  <option value="completed">เสร็จสิ้น (Completed)</option>
                  <option value="in_progress">ยังไม่เสร็จ (In Progress)</option>
                  <option value="pending_approval">ขออนุมัติปิดงาน (Request Approval)</option>
                </select>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button onClick={() => setShowRepairModal(false)} style={{ padding: '8px 16px', borderRadius: '8px', border: '1px solid #ddd', background: 'white', cursor: 'pointer' }}>ยกเลิก</button>
              <button onClick={handleSaveRepair} style={{ padding: '8px 16px', borderRadius: '8px', border: 'none', background: '#0284c7', color: 'white', cursor: 'pointer' }}>บันทึกข้อมูล</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default SupervisorDashboard;