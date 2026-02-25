import { lazy, Suspense, useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Sidebar from './Sidebar';
import './AdminDashboard.css';
import AnnouncementManager from './pages/AnnouncementManager';

import {
  Users, Building, FileText, Settings as SettingsIcon, Bell, User, LayoutDashboard,
  Search, Filter, MapPin, Trash, Pencil, UserPlus, LogOut, Shield, Wrench, Briefcase, Menu,
  ClipboardList, Clock, TrendingUp, Mail, Phone, Save, X, BookOpen, CheckCircle, AlertCircle, BarChart2, Activity
} from 'lucide-react';

import TaskList from './TaskList';
import MapComponent from './pages/Map';
import History from './pages/History';
import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import CustomReport from './pages/CustomReport';
import UserGuide from './pages/UserGuide';
import API_URL from '../config/api';

const BuildingManager = lazy(() => import('./BuildingManager'));

export default function AdminDashboard({ userId, onLogout }) {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [newUser, setNewUser] = useState({
    username: '',
    password: '',
    email: '',
    first_name: '',
    student_id_staff_id: '',
    role: 'user',
    department: '',
    phone: ''
  });

  // States for system settings
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('');

  // Dashboard states
  const [dashStats, setDashStats] = useState({ total: 0, pending: 0, in_progress: 0, pending_approval: 0, completed: 0 });
  const [teamWorkload, setTeamWorkload] = useState([]);
  const [recentTasks, setRecentTasks] = useState([]);
  const [dashLoading, setDashLoading] = useState(true);

  // Fetch popup on mount
  useEffect(() => {
    fetchPopup();
    fetchDashboardData();

    // Fetch user name
    const fetchUserName = async () => {
      try {
        const token = localStorage.getItem('token');
        const uid = userId || localStorage.getItem('user_id');
        const res = await fetch(`${API_URL}/api/users/${uid}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setUserName(data.first_name || data.username);
        }
      } catch (e) { console.error(e); }
    };
    fetchUserName();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setDashLoading(true);
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };

      const [statsRes, workloadRes, tasksRes] = await Promise.all([
        fetch(API_URL + '/api/admin/stats', { headers }),
        fetch(API_URL + '/api/admin/team-workload', { headers }),
        fetch(API_URL + '/api/admin/tasks?status=pending', { headers })
      ]);

      if (statsRes.ok) setDashStats(await statsRes.json());
      if (workloadRes.ok) setTeamWorkload(await workloadRes.json());
      if (tasksRes.ok) {
        const allTasks = await tasksRes.json();
        setRecentTasks(allTasks.slice(0, 5));
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setDashLoading(false);
    }
  };

  const fetchPopup = async () => {
    try {
      const res = await fetch(API_URL + '/api/popup');
      const data = await res.json();

      if (data.active && data.image_url) {
        Swal.fire({
          title: data.text || 'ประกาศข่าวสาร',
          imageUrl: `${API_URL}${data.image_url}`,
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

  const roles = [
    { value: 'all', label: 'ทั้งหมด', icon: <Users size={16} /> },
    { value: 'user', label: 'ผู้แจ้งซ่อม', icon: <User size={16} /> },
    { value: 'technician', label: 'ช่างซ่อม', icon: <Wrench size={16} /> },
    { value: 'supervisor', label: 'หัวหน้างาน', icon: <Briefcase size={16} /> },
    { value: 'admin', label: 'ผู้ดูแลระบบ', icon: <Shield size={16} /> }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    let result = users;
    if (selectedRole !== 'all') {
      result = result.filter(user => user.role === selectedRole);
    }
    if (searchTerm) {
      result = result.filter(user =>
        user.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (user.department && user.department.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    setFilteredUsers(result);
  }, [selectedRole, searchTerm, users]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URL + '/api/admin/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) throw new Error('Failed to fetch users');
      const data = await response.json();
      setUsers(data);
      setFilteredUsers(data);
    } catch (error) {
      console.error('Error fetching users:', error);
      Swal.fire('Error', 'ไม่สามารถดึงข้อมูลผู้ใช้งานได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser) {
      setNewUser({
        username: selectedUser.username || '',
        password: '',
        email: selectedUser.email || '',
        first_name: selectedUser.first_name || '',
        student_id_staff_id: selectedUser.student_id_staff_id || '',
        role: selectedUser.role || 'user',
        department: selectedUser.department || '',
        phone: selectedUser.phone || ''
      });
    } else {
      setNewUser({
        username: '', password: '', email: '', first_name: '',
        student_id_staff_id: '', role: 'user', department: '', phone: ''
      });
    }
  }, [selectedUser]);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      if (selectedUser) {
        // Edit Mode
        const updateData = {
          first_name: newUser.first_name,
          email: newUser.email,
          phone: newUser.phone,
          student_id_staff_id: newUser.student_id_staff_id,
          department: newUser.department,
          role: newUser.role
        };
        // Include password only if user typed a new one
        if (newUser.password) {
          updateData.password = newUser.password;
        }

        const response = await fetch(`${API_URL}/api/admin/users/${selectedUser.user_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(updateData)
        });

        if (response.ok) {
          Swal.fire('สำเร็จ', 'แก้ไขข้อมูลผู้ใช้งานเรียบร้อยแล้ว', 'success');
          setShowAddUserModal(false);
          setSelectedUser(null);
          fetchUsers();
        } else {
          const errorData = await response.json();
          Swal.fire('Error', errorData.message || 'ไม่สามารถแก้ไขข้อมูลได้', 'error');
        }
      } else {
        // Create Mode
        const response = await fetch(API_URL + '/api/admin/users', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            username: newUser.username,
            password: newUser.password,
            first_name: newUser.first_name,
            email: newUser.email,
            phone: newUser.phone,
            student_id_staff_id: newUser.student_id_staff_id,
            department: newUser.department,
            role: newUser.role
          })
        });

        if (response.ok) {
          Swal.fire('สำเร็จ', 'เพิ่มผู้ใช้งานเรียบร้อยแล้ว', 'success');
          setShowAddUserModal(false);
          setSelectedUser(null);
          setNewUser({
            username: '', password: '', email: '', first_name: '',
            student_id_staff_id: '', role: 'user', department: '', phone: ''
          });
          fetchUsers();
        } else {
          const errorData = await response.json();
          Swal.fire('Error', errorData.message || 'ไม่สามารถเพิ่มผู้ใช้งานได้', 'error');
        }
      }
    } catch (error) {
      console.error('Error saving user:', error);
      Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
    }
  };

  const handleDeleteUser = async (userId) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "คุณต้องการลบผู้ใช้งานนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ลบผู้ใช้งาน',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          Swal.fire('Deleted!', 'ลบผู้ใช้งานเรียบร้อยแล้ว', 'success');
          fetchUsers();
        } else {
          Swal.fire('Error', 'ไม่สามารถลบผู้ใช้งานได้', 'error');
        }
      } catch (error) {
        console.error('Error deleting user:', error);
        Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'error');
      }
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'badge-red';
      case 'supervisor': return 'badge-purple';
      case 'technician': return 'badge-orange';
      case 'user': return 'badge-blue';
      default: return 'badge-gray';
    }
  };

  const getRoleLabel = (role) => {
    const roleObj = roles.find(r => r.value === role);
    return roleObj ? roleObj.label : role;
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'ออกจากระบบ?',
      text: "คุณต้องการออกจากระบบใช่หรือไม่?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ออกจากระบบ',
      cancelButtonText: 'ยกเลิก',
      confirmButtonColor: '#d33'
    }).then((result) => {
      if (result.isConfirmed) {
        onLogout();
      }
    });
  };

  return (
    <>
      <div className="admin-dashboard">
        <Sidebar
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          onLogout={handleLogout}
          userRole="admin"
          userName={userName}
        />

        <main className="main-content">
          <div className="top-bar">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              <Menu size={24} />
            </button>
            <h1 className="page-title">
              {activeMenu === 'dashboard' && <><LayoutDashboard size={28} className="icon-gap" /> Dashboard</>}
              {activeMenu === 'users' && <><Users size={28} className="icon-gap" /> จัดการผู้ใช้งานและสิทธิ์</>}
              {activeMenu === 'buildings' && <><Building size={28} className="icon-gap" /> จัดการข้อมูลตึก</>}
              {activeMenu === 'history' && <><Clock size={28} className="icon-gap" /> ประวัติระบบ</>}
              {activeMenu === 'settings' && <><SettingsIcon size={28} className="icon-gap" /> ตั้งค่า</>}
              {activeMenu === 'notifications' && <><Bell size={28} className="icon-gap" /> จัดการข่าวสาร/ประกาศ</>}
              {activeMenu === 'profile' && <><User size={28} className="icon-gap" /> โปรไฟล์</>}
              {activeMenu === 'guide' && <><BookOpen size={28} className="icon-gap" /> คู่มือการใช้งาน</>}
            </h1>
          </div>

          {/* ========== DASHBOARD VIEW ========== */}
          {activeMenu === 'dashboard' && (
            <div className="container admin-dash-home">
              {dashLoading ? (
                <div className="loading-message" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '80px 20px' }}>
                  <div className="spinner-small" style={{ width: 40, height: 40, marginBottom: 16 }}></div>
                  <p>กำลังโหลดข้อมูล...</p>
                </div>
              ) : (
                <>
                  {/* Overview Banner */}
                  <div className="adh-overview">
                    <div className="adh-overview-left">
                      <span className="adh-overview-label">สรุปภาพรวมระบบ</span>
                      <span className="adh-overview-total">{dashStats.total || 0}</span>
                      <span className="adh-overview-sub">งานแจ้งซ่อมทั้งหมด</span>
                    </div>
                    <div className="adh-overview-right">
                      <svg width="80" height="80" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="32" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="7" />
                        <circle cx="40" cy="40" r="32"
                          fill="none"
                          stroke={(() => {
                            const total = dashStats.total || 0;
                            const rate = total > 0 ? (dashStats.completed || 0) / total * 100 : 0;
                            return rate >= 70 ? '#34d399' : rate >= 40 ? '#fbbf24' : '#f87171';
                          })()}
                          strokeWidth="7"
                          strokeDasharray={2 * Math.PI * 32}
                          strokeDashoffset={(() => {
                            const total = dashStats.total || 0;
                            const rate = total > 0 ? (dashStats.completed || 0) / total * 100 : 0;
                            return 2 * Math.PI * 32 - (rate / 100) * 2 * Math.PI * 32;
                          })()}
                          strokeLinecap="round"
                          transform="rotate(-90 40 40)"
                          style={{ transition: 'stroke-dashoffset 1s ease' }}
                        />
                        <text x="40" y="37" textAnchor="middle" style={{ fontSize: '16px', fontWeight: 800, fill: '#fff' }}>
                          {(() => {
                            const total = dashStats.total || 0;
                            return total > 0 ? ((dashStats.completed || 0) / total * 100).toFixed(0) : 0;
                          })()}%
                        </text>
                        <text x="40" y="51" textAnchor="middle" style={{ fontSize: '10px', fill: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>สำเร็จ</text>
                      </svg>
                    </div>
                  </div>

                  {/* Stat Cards */}
                  <div className="adh-stats-grid">
                    <div className="adh-stat-card adh-stat-pending">
                      <div className="adh-stat-icon"><Clock size={24} /></div>
                      <div className="adh-stat-info">
                        <span className="adh-stat-number">{dashStats.pending}</span>
                        <span className="adh-stat-label">รอมอบหมาย</span>
                      </div>
                    </div>
                    <div className="adh-stat-card adh-stat-progress">
                      <div className="adh-stat-icon"><Wrench size={24} /></div>
                      <div className="adh-stat-info">
                        <span className="adh-stat-number">{dashStats.in_progress}</span>
                        <span className="adh-stat-label">กำลังดำเนินการ</span>
                      </div>
                    </div>
                    <div className="adh-stat-card adh-stat-done">
                      <div className="adh-stat-icon"><CheckCircle size={24} /></div>
                      <div className="adh-stat-info">
                        <span className="adh-stat-number">{dashStats.completed || 0}</span>
                        <span className="adh-stat-label">เสร็จสิ้น</span>
                      </div>
                    </div>
                  </div>

                  {/* Two-Column Section: Users + Workload */}
                  <div className="adh-two-col">
                    {/* User Role Distribution */}
                    <div className="adh-section">
                      <h3 className="adh-section-title"><Users size={18} /> สรุปผู้ใช้ในระบบ</h3>
                      <div className="adh-role-grid">
                        {[
                          { role: 'user', label: 'ผู้แจ้งซ่อม', icon: <User size={20} />, color: '#3b82f6', bg: '#dbeafe' },
                          { role: 'technician', label: 'ช่างเทคนิค', icon: <Wrench size={20} />, color: '#f59e0b', bg: '#fef3c7' },
                          { role: 'supervisor', label: 'หัวหน้างาน', icon: <Briefcase size={20} />, color: '#8b5cf6', bg: '#ede9fe' },
                          { role: 'admin', label: 'ผู้ดูแลระบบ', icon: <Shield size={20} />, color: '#ef4444', bg: '#fee2e2' }
                        ].map(r => (
                          <div key={r.role} className="adh-role-card">
                            <div className="adh-role-icon" style={{ background: r.bg, color: r.color }}>{r.icon}</div>
                            <div className="adh-role-info">
                              <span className="adh-role-count">{users.filter(u => u.role === r.role).length}</span>
                              <span className="adh-role-label">{r.label}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Team Workload */}
                    <div className="adh-section">
                      <h3 className="adh-section-title"><BarChart2 size={18} /> ภาระงานทีมช่าง</h3>
                      {teamWorkload.length === 0 ? (
                        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>ยังไม่มีข้อมูลทีมช่าง</p>
                      ) : (
                        <div className="adh-workload-list">
                          {teamWorkload.map((tech, idx) => (
                            <div key={idx} className="adh-workload-item">
                              <div className="adh-workload-user">
                                <div className="adh-wl-avatar" style={{
                                  background: tech.tasks > 5 ? 'linear-gradient(135deg, #fecaca, #fca5a5)' :
                                    tech.tasks > 0 ? 'linear-gradient(135deg, #dbeafe, #bfdbfe)' :
                                      'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                                  color: tech.tasks > 5 ? '#dc2626' : tech.tasks > 0 ? '#2563eb' : '#16a34a'
                                }}>
                                  {tech.name?.charAt(0) || '?'}
                                </div>
                                <span className="adh-wl-name">{tech.name}</span>
                              </div>
                              <div className="adh-wl-bar-wrap">
                                <div className="adh-wl-bar" style={{
                                  width: `${Math.min((tech.tasks / 10) * 100, 100)}%`,
                                  background: tech.tasks > 5
                                    ? 'linear-gradient(90deg, #f87171, #ef4444)'
                                    : tech.tasks > 0
                                      ? 'linear-gradient(90deg, #60a5fa, #3b82f6)'
                                      : 'linear-gradient(90deg, #34d399, #10b981)'
                                }}></div>
                              </div>
                              <span className="adh-wl-count">{tech.tasks} งาน</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeMenu === 'users' && (
            <div className="container">
              <div className="search-container">
                <input
                  type="text"
                  placeholder="ค้นหาชื่อ, รหัสพนักงาน หรือแผนก..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>

              <div className="tabs-container">
                <div className="tabs">
                  {roles.map(role => (
                    <button
                      key={role.value}
                      className={`tab ${selectedRole === role.value ? 'active' : ''}`}
                      onClick={() => setSelectedRole(role.value)}
                    >
                      {role.icon} {role.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="stats-bar">
                <p><Users size={20} className="icon-gap" /> ผู้ใช้งานทั้งหมด {filteredUsers.length} ราย</p>
                <button className="filter-button"><Filter size={16} className="icon-gap" /> กรองข้อมูล</button>
              </div>

              <div className="users-table-container">
                <table className="users-table">
                  <thead>
                    <tr>
                      <th>ผู้ใช้งาน</th>
                      <th>ตำแหน่ง</th>
                      <th>สังกัด/หน่วยงาน</th>
                      <th>ติดต่อ</th>
                      <th>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="5" className="loading-cell">
                          <div className="spinner-small"></div> กำลังโหลดข้อมูล...
                        </td>
                      </tr>
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="empty-cell">ไม่พบข้อมูลผู้ใช้งาน</td>
                      </tr>
                    ) : (
                      filteredUsers.map(user => (
                        <tr key={user.user_id}>
                          <td>
                            <div className="user-cell-info">
                              <div className="user-avatar-small">
                                {user.first_name.charAt(0).toUpperCase()}
                              </div>
                              <div className="user-text">
                                <span className="user-name">{user.first_name}</span>
                                <span className="user-username">@{user.username}</span>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`role-badge ${getRoleBadgeColor(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td>{user.department || '-'}</td>
                          <td>
                            <div className="contact-info">
                              {user.email && <div className="contact-item"><Mail size={14} /> {user.email}</div>}
                              {user.phone && <div className="contact-item"><Phone size={14} /> {user.phone}</div>}
                            </div>
                          </td>
                          <td>
                            <div className="action-buttons">
                              <button className="action-btn edit" onClick={() => { setSelectedUser(user); setShowAddUserModal(true); }} title="แก้ไข">
                                <Pencil size={18} />
                              </button>
                              <button className="action-btn delete" onClick={() => handleDeleteUser(user.user_id)} title="ลบ">
                                <Trash size={18} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <button
                className="fab"
                onClick={() => { setSelectedUser(null); setShowAddUserModal(true); }}
                title="เพิ่มผู้ใช้งานใหม่"
              >
                <UserPlus size={32} strokeWidth={2.5} />
              </button>
            </div>
          )}

          {activeMenu === 'buildings' && (
            <Suspense fallback={<div>Loading...</div>}>
              <BuildingManager />
            </Suspense>
          )}

          {activeMenu === 'notifications' && <AnnouncementManager />}
          {activeMenu === 'reports' && <Reports />}

          {activeMenu === 'history' && <History />}
          {activeMenu === 'profile' && (
            <div className="content-wrapper">
              <Profile userId={userId} />
            </div>
          )}
          {activeMenu === 'settings' && <Settings />}
          {activeMenu === 'guide' && <UserGuide userRole="admin" />}

        </main>
      </div>

      {showAddUserModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) { setShowAddUserModal(false); setSelectedUser(null); } }}>
          <div className="modal-content">
            <div className="modal-header">
              <h2>{selectedUser ? '✏️ แก้ไขผู้ใช้งาน' : '➕ เพิ่มผู้ใช้งานใหม่'}</h2>
              <button
                type="button"
                className="close-btn"
                onClick={() => { setShowAddUserModal(false); setSelectedUser(null); }}
              >
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <form id="userForm" onSubmit={handleCreateUser}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Username</label>
                    <input
                      type="text"
                      value={newUser.username}
                      onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                      required
                      disabled={!!selectedUser}
                      placeholder={selectedUser ? "ไม่สามารถเปลี่ยนได้" : "กรอก username"}
                    />
                  </div>

                  <div className="form-group">
                    <label>{selectedUser ? 'เปลี่ยนรหัสผ่าน (เว้นว่างถ้าไม่ต้องการเปลี่ยน)' : 'Password'}</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                      required={!selectedUser}
                      placeholder={selectedUser ? 'เว้นว่างถ้าไม่เปลี่ยน' : 'กรอกรหัสผ่าน'}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>ชื่อ-นามสกุล</label>
                  <input
                    type="text"
                    value={newUser.first_name}
                    onChange={e => setNewUser({ ...newUser, first_name: e.target.value })}
                    required
                    placeholder="เช่น สมชาย ใจดี"
                  />
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>อีเมล</label>
                    <input
                      type="email"
                      value={newUser.email}
                      onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                      required
                      placeholder="user@example.com"
                    />
                  </div>

                  <div className="form-group">
                    <label>เบอร์โทรศัพท์</label>
                    <input
                      type="tel"
                      value={newUser.phone}
                      onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                      placeholder="0812345678"
                    />
                  </div>
                </div>

                <div className="form-grid">
                  <div className="form-group">
                    <label>รหัสนักศึกษา/พนักงาน</label>
                    <input
                      type="text"
                      value={newUser.student_id_staff_id}
                      onChange={e => setNewUser({ ...newUser, student_id_staff_id: e.target.value })}
                      placeholder="63xxxxx"
                    />
                  </div>

                  <div className="form-group">
                    <label>สังกัด/หน่วยงาน</label>
                    <input
                      type="text"
                      value={newUser.department}
                      onChange={e => setNewUser({ ...newUser, department: e.target.value })}
                      placeholder="เช่น IT Support"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>สิทธิ์การใช้งาน (Role)</label>
                  <select
                    value={newUser.role}
                    onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                  >
                    <option value="user">User (ผู้แจ้งซ่อม)</option>
                    <option value="technician">Technician (ช่างซ่อม)</option>
                    <option value="supervisor">Supervisor (หัวหน้าช่าง)</option>
                    <option value="admin">Admin (ผู้ดูแลระบบ)</option>
                  </select>
                </div>
              </form>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => { setShowAddUserModal(false); setSelectedUser(null); }}>
                <X size={18} /> ยกเลิก
              </button>
              <button type="submit" form="userForm" className="btn-primary">
                <Save size={18} /> {selectedUser ? 'บันทึกการแก้ไข' : 'เพิ่มผู้ใช้งาน'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}