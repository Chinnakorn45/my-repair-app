import './Sidebar.css';
import {
  Users, Building, FileText, Settings, Bell, User,
  LayoutDashboard, ClipboardList, Map, Wrench, Menu, X, LogOut, Clock, Printer
} from 'lucide-react';

const Sidebar = ({
  activeMenu,
  setActiveMenu,
  sidebarOpen,
  setSidebarOpen,
  onLogout,
  userRole
}) => {
  const menuConfig = {
    admin: {
      title: 'ผู้ดูแลระบบ',
      menus: [
        { id: 'users', icon: <Users size={20} />, text: 'จัดการผู้ใช้' },
        { id: 'buildings', icon: <Building size={20} />, text: 'จัดการอาคาร' },
        { id: 'history', icon: <Clock size={20} />, text: 'ประวัติระบบ' },

        { id: 'settings', icon: <Settings size={20} />, text: 'ตั้งค่า' },
        { id: 'notifications', icon: <Bell size={20} />, text: 'จัดการข่าวสาร/ประกาศ' },
        { id: 'profile', icon: <User size={20} />, text: 'โปรไฟล์' }
      ]
    },
    supervisor: {
      title: 'หัวหน้างาน',
      menus: [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, text: 'Dashboard' },
        { id: 'tasks', icon: <ClipboardList size={20} />, text: 'จัดการงานซ่อม' },
        { id: 'reports', icon: <FileText size={20} />, text: 'รายงาน' },
        { id: 'custom-report', icon: <Printer size={20} />, text: 'พิมพ์รายงาน' },
        { id: 'notifications', icon: <Bell size={20} />, text: 'การแจ้งเตือน' },
        { id: 'profile', icon: <User size={20} />, text: 'โปรไฟล์' }
      ]
    },
    technician: {
      title: 'ช่างเทคนิค',
      menus: [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, text: 'Dashboard' },
        { id: 'map', icon: <Map size={20} />, text: 'แผนที่งานซ่อม' },
        { id: 'my-tasks', icon: <Wrench size={20} />, text: 'งานของฉัน' },
        { id: 'new-request', icon: <FileText size={20} />, text: 'แจ้งซ่อมใหม่' },
        { id: 'history', icon: <ClipboardList size={20} />, text: 'ประวัติงาน' },
        { id: 'notifications', icon: <Bell size={20} />, text: 'การแจ้งเตือน' },
        { id: 'profile', icon: <User size={20} />, text: 'โปรไฟล์' }
      ]
    },
    user: {
      title: 'ผู้ใช้งาน',
      menus: [
        { id: 'dashboard', icon: <LayoutDashboard size={20} />, text: 'หน้าหลัก' },
        { id: 'new-request', icon: <FileText size={20} />, text: 'แจ้งซ่อมใหม่' },
        { id: 'my-requests', icon: <ClipboardList size={20} />, text: 'รายการแจ้งซ่อม' },
        { id: 'history', icon: <ClipboardList size={20} />, text: 'ประวัติ' },
        { id: 'notifications', icon: <Bell size={20} />, text: 'การแจ้งเตือน' },
        { id: 'profile', icon: <User size={20} />, text: 'โปรไฟล์' }
      ]
    }
  };

  const currentConfig = menuConfig[userRole] || menuConfig.user;

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2>{currentConfig.title}</h2>
          <button
            className="sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {currentConfig.menus.map(menu => (
            <button
              key={menu.id}
              className={`nav-item ${activeMenu === menu.id ? 'active' : ''}`}
              onClick={() => {
                setActiveMenu(menu.id);
                setSidebarOpen(false);
              }}
            >
              <span className="nav-icon">{menu.icon}</span>
              <span className="nav-text">{menu.text}</span>
            </button>
          ))}

          <div className="nav-divider" />

          <button className="nav-item logout" onClick={onLogout}>
            <span className="nav-icon"><LogOut size={20} /></span>
            <span className="nav-text">ออกจากระบบ</span>
          </button>
        </nav>
      </aside>

      {/* Overlay สำหรับ Mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  );
};

export default Sidebar;
