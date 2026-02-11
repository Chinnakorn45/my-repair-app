import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Sidebar from './Sidebar';
import './UserDashboard.css';
import {
  LayoutDashboard, FileText, ClipboardList, Clock, Bell, User, Menu
} from 'lucide-react';

// ✅ Import หน้าแยกจากโฟลเดอร์ pages
import DashboardHome from "./pages/DashboardHome";
import MyRequests from "./pages/MyRequests";
import Profile from "./pages/Profile";
import History from "./pages/History";

// ✅ Import ไฟล์ที่มีอยู่จริงแต่นอกโฟลเดอร์ pages (ตามรูปโครงสร้างไฟล์)
import NewRequest from "./pages/NewRepairRequest";

// ✅ Import AnnouncementFeed
import Notifications from "./pages/AnnouncementFeed";

const UserDashboard = ({ userId, onLogout }) => {
  const [activeMenu, setActiveMenu] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userName, setUserName] = useState('User');
  const [userRole, setUserRole] = useState('user');

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
          headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('token')
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUserName(data.first_name || data.username);
          setUserRole(data.role || 'user');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    const fetchPopup = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/popup');
        const data = await res.json();

        // Show popup if active and exists
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

    if (userId) {
      fetchUserData();
      // Call popup fetch only once on mount (or you can use session storage to limit 1 per session)
      fetchPopup();
    }
  }, [userId]);

  // ✅ ฟังก์ชันสำหรับดึงชื่อหน้าปัจจุบันแสดงบน Top Bar
  const getPageTitle = () => {
    switch (activeMenu) {
      case 'dashboard': return <><LayoutDashboard size={28} className="icon-gap" /> หน้าหลัก</>;
      case 'new-request': return <><FileText size={28} className="icon-gap" /> แจ้งซ่อมใหม่</>;
      case 'my-requests': return <><ClipboardList size={28} className="icon-gap" /> รายการแจ้งซ่อม</>;
      case 'history': return <><Clock size={28} className="icon-gap" /> ประวัติ</>;
      case 'notifications': return <><Bell size={28} className="icon-gap" /> การแจ้งเตือน</>;
      case 'profile': return <><User size={28} className="icon-gap" /> โปรไฟล์</>;
      default: return 'ระบบจัดการงานซ่อม';
    }
  };

  // ✅ ฟังก์ชัน Logout
  const handleLogout = () => {
    Swal.fire({
      title: 'ออกจากระบบ?',
      text: "คุณต้องการออกจากระบบใช่หรือไม่",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'ออกจากระบบ',
      cancelButtonText: 'ยกเลิก'
    }).then((result) => {
      if (result.isConfirmed) {
        onLogout();
      }
    });
  };

  // ✅ ฟังก์ชัน Render หน้าต่างๆ
  const renderPage = () => {
    switch (activeMenu) {
      case 'dashboard':
        return <DashboardHome userId={userId} />;
      case 'new-request':
        return <NewRequest userId={userId} />;
      case 'my-requests':
        return <MyRequests userId={userId} />;
      case 'history':
        return <History userId={userId} />;
      case 'notifications':
        return <Notifications />;
      case 'profile':
        return <Profile userId={userId} />;
      default:
        return <DashboardHome userId={userId} />;
    }
  };

  return (
    <div className="user-dashboard">
      {/* ... (Sidebar) */}
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={setActiveMenu}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        onLogout={handleLogout}
        userRole={userRole}
      />

      <main className="main-content">
        {/* ✅ Top Bar เปลี่ยนชื่อตามเมนู */}
        <div className="top-bar">
          <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <Menu size={24} />
          </button>
          <div className="header-content">
            <h1 className="page-title">{getPageTitle()}</h1>
          </div>
          <div className="user-greeting">สวัสดี, {userName}</div>
        </div>


        {/* ✅ ส่วนแสดงเนื้อหาของแต่ละหน้า */}
        <div className="container">
          {renderPage()}
        </div>
      </main>

      {/* ✅ Overlay สำหรับมือถือ */}
      {sidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>
      )}
    </div>
  );
};

export default UserDashboard;