import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  LayoutDashboard, Map, ClipboardList, FileText, Bell, User, Menu, Wrench
} from 'lucide-react';
import Sidebar from './Sidebar';
import Dashboard from './pages/DashboardHome';
import MyTasks from './pages/Mytasks';
import MapComponent from './pages/Map'; // Renamed to avoid partial conflict with Map icon
import NewRepairRequest from './pages/NewRepairRequest';
import History from './pages/History';
import Notifications from './pages/AnnouncementFeed';
import Profile from './pages/Profile';
import './TechnicianDashboard.css';

const TechnicianDashboard = () => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ดึง Role และ User ID จาก localStorage
  const userRole = localStorage.getItem('user_role') || 'technician';
  const userId = localStorage.getItem('user_id');

  useEffect(() => {
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

    fetchPopup();
  }, []);

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
        localStorage.removeItem('user_id');
        window.location.href = '/login';
      }
    });
  };

  const renderContent = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <Dashboard />;
      case 'my-tasks':
        return <MyTasks />;
      case 'map':
        return <MapComponent />;

      case 'history':
        return <History />;
      case 'notifications':
        return <Notifications />;
      case 'profile':
        return userId ? (
          <Profile userId={userId} />
        ) : (
          <div className="placeholder-content">
            <div className="placeholder-icon">⚠️</div>
            <h2>ไม่พบข้อมูลผู้ใช้</h2>
            <p>กรุณาเข้าสู่ระบบใหม่</p>
            <button
              onClick={() => window.location.href = '/login'}
              className="btn btn-primary"
            >
              เข้าสู่ระบบ
            </button>
          </div>
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="technician-dashboard">
      {/* Unified Sidebar with Role-based Menu */}
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={handleLogout}
        userRole={userRole}
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
            {activeMenu === 'map' && <><Map size={28} className="icon-gap" /> แผนที่งานซ่อม</>}
            {activeMenu === 'my-tasks' && <><Wrench size={28} className="icon-gap" /> งานของฉัน</>}

            {activeMenu === 'history' && <><ClipboardList size={28} className="icon-gap" /> ประวัติงาน</>}
            {activeMenu === 'notifications' && <><Bell size={28} className="icon-gap" /> การแจ้งเตือน</>}
            {activeMenu === 'profile' && <><User size={28} className="icon-gap" /> โปรไฟล์</>}
          </h1>
        </div>

        <div className="container">
          {renderContent()}
        </div>
      </main>
    </div>
  );
};

export default TechnicianDashboard;