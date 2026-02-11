import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { io } from 'socket.io-client';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import NewRepairRequest from './components/pages/NewRepairRequest';
import Register from './components/Register';
import SupervisorDashboard from './components/SupervisorDashboard';
import TechnicianDashboard from './components/TechnicianDashboard';
import UserDashboard from './components/UserDashboard'; // หรือ path ที่คุณเก็บไฟล์นี้ไว้

let socket;

function App() {
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  const [showNewRequest, setShowNewRequest] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user_id = localStorage.getItem('user_id');
    const role = localStorage.getItem('user_role');

    if (token && user_id) {
      setUserId(user_id);
      setUserRole(role);
      initSocket();
    }
  }, []);

  const initSocket = () => {
    socket = io('http://localhost:5000', {
      auth: {
        token: localStorage.getItem('token')
      }
    });

    socket.on('new_request', (data) => {
      Swal.fire({
        icon: 'info',
        title: 'มีแจ้งซ่อมใหม่',
        text: 'ID: ' + data.request_id,
        timer: 5000,
        toast: true,
        position: 'top-end',
        showConfirmButton: false
      });
    });
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_id');
    localStorage.removeItem('user_role');
    setUserId(null);
    setUserRole(null);
    if (socket) socket.disconnect();
  };

  const handleLoginSuccess = (user_id, role) => {
    setUserId(user_id);
    setUserRole(role);
    localStorage.setItem('user_role', role);
    initSocket();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('description', e.target.description.value);
    formData.append('lat', e.target.lat.value);
    formData.append('lng', e.target.lng.value);
    formData.append('image', e.target.file.files[0]);

    try {
      const response = await fetch('http://localhost:5000/api/repair-requests', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: formData
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'สำเร็จ',
          text: 'ส่งแจ้งซ่อมสำเร็จ!',
          timer: 2000,
          showConfirmButton: false
        });
        setShowNewRequest(false);
      } else {
        Swal.fire({
          icon: 'error',
          title: 'เกิดข้อผิดพลาด',
          text: 'ไม่สามารถส่งข้อมูลได้'
        });
      }
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'เกิดข้อผิดพลาด',
        text: error.message
      });
    }
  };

  if (!userId) {
    if (showRegister) {
      return (
        <Register
          onRegisterSuccess={(user_id, role) => {
            setUserId(user_id);
            setUserRole(role);
            initSocket();
          }}
          onSwitchToLogin={() => setShowRegister(false)}
        />
      );
    }
    return (
      <Login
        onLoginSuccess={handleLoginSuccess}
        onSwitchToRegister={() => setShowRegister(true)}
      />
    );
  }

  if (showNewRequest) {
    return (
      <NewRepairRequest
        userId={userId}
        onSubmit={handleSubmit}
        onCancel={() => setShowNewRequest(false)}
      />
    );
  }

  // Show appropriate dashboard based on role
  if (userRole === 'admin') {
    return (
      <AdminDashboard
        userId={userId}
        onLogout={handleLogout}
      />
    );
  }

  if (userRole === 'supervisor') {
    return (
      <SupervisorDashboard
        userId={userId}
        onLogout={handleLogout}
      />
    );
  }

  if (userRole === 'technician') {
    return (
      <TechnicianDashboard
        userId={userId}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <UserDashboard
      userId={userId}
      onLogout={handleLogout}
      onNewRequest={() => setShowNewRequest(true)}
    />
  );
}
export default App;