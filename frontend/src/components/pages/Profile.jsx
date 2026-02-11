import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import {
  User, Mail, Phone, IdCard, Building, Calendar, Edit, Save, X, CheckCircle, AlertCircle
} from 'lucide-react';
import { formatThaiDate } from '../../utils/dateUtils';
import './Profile.css';

const Profile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    email: '',
    phone: '',
    student_id_staff_id: '',
    department: ''
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchUserProfile();
  }, [userId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
        setFormData({
          first_name: data.first_name || '',
          email: data.email || '',
          phone: data.phone || '',
          student_id_staff_id: data.student_id_staff_id || '',
          department: data.department || ''
        });
      } else {
        console.error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      const response = await fetch(`http://localhost:5000/api/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(updatedUser);
        setIsEditing(false);
        setMessage({
          type: 'success',
          text: <span className="flex items-center gap-2"><CheckCircle size={16} /> บันทึกข้อมูลสำเร็จ</span>
        });

        // Clear message after 3 seconds
        setTimeout(() => {
          setMessage({ type: '', text: '' });
        }, 3000);
      } else {
        setMessage({
          type: 'error',
          text: <span className="flex items-center gap-2"><X size={16} /> เกิดข้อผิดพลาดในการบันทึกข้อมูล</span>
        });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessage({
        type: 'error',
        text: <span className="flex items-center gap-2"><AlertCircle size={16} /> ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์</span>
      });
    }
  };

  const handleCancel = () => {
    Swal.fire({
      title: 'ยกเลิกการแก้ไข?',
      text: "ข้อมูลที่คุณแก้ไขจะไม่ถูกบันทึก",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ยกเลิก',
      cancelButtonText: 'กลับไปแก้ไข'
    }).then((result) => {
      if (result.isConfirmed) {
        setFormData({
          first_name: user.first_name || '',
          email: user.email || '',
          phone: user.phone || '',
          student_id_staff_id: user.student_id_staff_id || '',
          department: user.department || ''
        });
        setIsEditing(false);
        setMessage({ type: '', text: '' });
      }
    });
  };

  const getRoleText = (role) => {
    const roleMap = {
      user: 'ผู้ใช้งานทั่วไป',
      technician: 'ช่างซ่อม',
      supervisor: 'หัวหน้าช่าง',
      admin: 'ผู้ดูแลระบบ'
    };
    return roleMap[role] || role;
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile-error">
        <p><X size={24} /> ไม่พบข้อมูลผู้ใช้</p>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <div className="profile-avatar">
          <div className="avatar-icon">
            {user.first_name ? user.first_name.charAt(0).toUpperCase() : <User size={48} />}
          </div>
        </div>
        <div className="profile-header-info">
          <h2>{user.first_name || 'ไม่ระบุชื่อ'}</h2>
          <span className="role-badge">{getRoleText(user.role)}</span>
        </div>
      </div>

      {message.text && (
        <div className={`message-box ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="profile-content">
        {!isEditing ? (
          // View Mode
          <div className="profile-view">
            <div className="info-section">
              <h3>ข้อมูลส่วนตัว</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label><User size={16} /> ชื่อ-นามสกุล</label>
                  <p>{user.first_name || '-'}</p>
                </div>

                <div className="info-item">
                  <label><IdCard size={16} /> ตำแหน่ง/บทบาท</label>
                  <p>{getRoleText(user.role)}</p>
                </div>

                <div className="info-item">
                  <label><Mail size={16} /> อีเมล</label>
                  <p>{user.email || '-'}</p>
                </div>

                <div className="info-item">
                  <label><Phone size={16} /> เบอร์โทรศัพท์</label>
                  <p>{user.phone || '-'}</p>
                </div>

                <div className="info-item">
                  <label><IdCard size={16} /> รหัสนักศึกษา/พนักงาน</label>
                  <p>{user.student_id_staff_id || '-'}</p>
                </div>

                <div className="info-item">
                  <label><Building size={16} /> คณะ/หน่วยงาน</label>
                  <p>{user.department || '-'}</p>
                </div>

                <div className="info-item">
                  <label><User size={16} /> ชื่อผู้ใช้</label>
                  <p>{user.username}</p>
                </div>

                <div className="info-item">
                  <label><Calendar size={16} /> สมัครเมื่อ</label>
                  <p>{formatThaiDate(user.created_at, 'long')}</p>
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setIsEditing(true)}
            >
              <Edit size={16} /> แก้ไขข้อมูล
            </button>
          </div>
        ) : (
          // Edit Mode
          <form className="profile-edit" onSubmit={handleSubmit}>
            <div className="info-section">
              <h3>แก้ไขข้อมูลส่วนตัว</h3>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="first_name">ชื่อ-นามสกุล *</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleChange}
                    required
                    placeholder="กรอกชื่อ-นามสกุล"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">อีเมล *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="example@email.com"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">เบอร์โทรศัพท์</label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0812345678"
                    maxLength="10"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="student_id_staff_id">รหัสนักศึกษา/พนักงาน</label>
                  <input
                    type="text"
                    id="student_id_staff_id"
                    name="student_id_staff_id"
                    value={formData.student_id_staff_id}
                    onChange={handleChange}
                    placeholder="6301234567"
                  />
                </div>

                <div className="form-group full-width">
                  <label htmlFor="department">คณะ/หน่วยงาน</label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={formData.department}
                    onChange={handleChange}
                    placeholder="เช่น คณะวิศวกรรมศาสตร์"
                  />
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-success">
                <Save size={16} /> บันทึกข้อมูล
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleCancel}
              >
                <X size={16} /> ยกเลิก
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default Profile;