import { useState } from 'react';
import Swal from 'sweetalert2';
import {
  ArrowLeft, User, IdCard, Building, Phone, Mail, Lock, Key, UserPlus
} from 'lucide-react';
import './Register.css';
import API_URL from '../config/api';

function Register({ onRegisterSuccess, onSwitchToLogin }) {
  const [formData, setFormData] = useState({
    first_name: '',
    student_id_staff_id: '',
    department: '',
    phone: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);

  const departmentOptions = [
    'คณะครุศาสตร์',
    'วิทยาลัยนานาชาติการท่องเที่ยว',
    'โรงเรียนสาธิตแห่งมหาวิทยาลัยราชภัฏสุราษฎร์ธานี',
    'คณะวิทยาศาสตร์และเทคโนโลยี',
    'คณะวิทยาการจัดการ',
    'คณะมนุษยศาสตร์และสังคมศาสตร์',
    'คณะนิติศาสตร์',
    'พยาบาลศาสตร์',
    'สำนักงานอธิการบดี',
    'สภามหาวิทยาลัย',
    'สำนักงานอธิการบดี',
    'สถาบันวิจัยและพัฒนา',
    'สำนักวิทยบริการและเทคโนโลยีสารสนเทศ',
    'สำนักศิลปะและวัฒนธรรม',
    'สำนักส่งเสริมวิชาการและงานทะเบียน',
    'สำนักประกันคุณภาพการศึกษา'
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.first_name.trim()) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อและนามสกุล', 'warning');
    if (!formData.student_id_staff_id.trim()) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกรหัสนักศึกษา/บุคลากร', 'warning');
    if (!formData.department) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณาเลือกคณะ/หน่วยงาน', 'warning');
    if (!formData.phone.trim()) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกเบอร์โทรศัพท์', 'warning');
    if (!formData.username.trim()) return Swal.fire('ข้อมูลไม่ครบ', 'กรุณากรอกชื่อผู้ใช้งาน (Username)', 'warning');

    // Relaxed password check
    if (formData.password.length < 4) return Swal.fire('รหัสผ่านสั้นเกินไป', 'รหัสผ่านต้องมีความยาวอย่างน้อย 4 ตัวอักษร', 'warning');
    if (formData.password !== formData.confirmPassword) return Swal.fire('รหัสผ่านไม่ตรงกัน', 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน', 'warning');

    setLoading(true);

    try {
      // Fixed API endpoint
      const response = await fetch(API_URL + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          first_name: formData.first_name,
          student_id_staff_id: formData.student_id_staff_id,
          role: 'user',
          department: formData.department,
          phone: formData.phone
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('user_role', data.role);

        Swal.fire({
          title: 'สมัครสมาชิกสำเร็จ!',
          text: 'ยินดีต้อนรับเข้าสู่ระบบ',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false
        }).then(() => {
          onRegisterSuccess(data.user_id, data.role);
        });
      } else {
        const errorData = await response.json();
        Swal.fire('เกิดข้อผิดพลาด', errorData.message || 'ไม่สามารถสมัครสมาชิกได้', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-topbar">
          <button
            onClick={onSwitchToLogin}
            className="register-back-button"
            title="กลับไปหน้าเข้าสู่ระบบ"
          >
            <ArrowLeft size={24} />
          </button>
          <h2 className="register-topbar-title">สมัครสมาชิก</h2>
        </div>

        <div className="register-header">
          <div className="register-header-image" style={{ backgroundImage: `url('/images/register-bg.jpg')` }}></div>
          <div className="register-header-overlay"></div>
          <div className="register-header-accent"></div>
          <div className="register-header-content">
            <p className="register-header-title">ยินดีต้อนรับสู่<br />ระบบแจ้งซ่อม มรส.</p>
            <p className="register-header-subtitle">Suratthani Rajabhat University Maintenance</p>
          </div>
        </div>

        <div className="register-content">
          <div className="register-headline">
            <h3 className="register-headline-title">ลงทะเบียนผู้ใช้งานใหม่</h3>
            <p className="register-headline-subtitle">กรุณากรอกข้อมูลส่วนตัวเพื่อเข้าใช้งานระบบ</p>
          </div>

          <form onSubmit={handleSubmit} className="register-form">
            <div className="register-form-group">
              <label className="register-label">ชื่อ-นามสกุล</label>
              <div className="register-input-wrapper">
                <span className="register-input-icon"><User size={20} /></span>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  placeholder="กรุณากรอกชื่อและนามสกุล"
                  className="register-input"
                />
              </div>
            </div>

            <div className="register-form-group">
              <label className="register-label">รหัสนักศึกษา/บุคลากร</label>
              <div className="register-input-wrapper">
                <span className="register-input-icon"><IdCard size={20} /></span>
                <input
                  type="text"
                  name="student_id_staff_id"
                  value={formData.student_id_staff_id}
                  onChange={handleChange}
                  placeholder="กรุณากรอกรหัสนักศึกษา/บุคลาก "
                  className="register-input"
                />
              </div>
            </div>

            <div className="register-form-group">
              <label className="register-label">คณะ/หน่วยงาน</label>
              <div className="register-input-wrapper">
                <span className="register-input-icon"><Building size={20} /></span>
                <select
                  name="department"
                  value={formData.department}
                  onChange={handleChange}
                  className="register-input register-select"
                >
                  <option value="">เลือกคณะหรือหน่วยงาน</option>
                  {departmentOptions.map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="register-form-group">
              <label className="register-label">เบอร์โทรศัพท์</label>
              <div className="register-input-wrapper">
                <span className="register-input-icon"><Phone size={20} /></span>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="0xx-xxx-xxxx"
                  className="register-input"
                />
              </div>
            </div>

            <div className="register-form-group">
              <label className="register-label">อีเมล</label>
              <div className="register-input-wrapper">
                <span className="register-input-icon"><Mail size={20} /></span>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="user@example.com"
                  className="register-input"
                />
              </div>
            </div>

            <div className="register-form-group">
              <label className="register-label">ชื่อผู้ใช้งาน (Username)</label>
              <div className="register-input-wrapper">
                <span className="register-input-icon"><User size={20} /></span>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="ตั้งชื่อผู้ใช้งาน (ภาษาอังกฤษ)"
                  className="register-input"
                />
              </div>
            </div>

            <div className="register-form-group">
              <label className="register-label">รหัสผ่าน</label>
              <div className="register-input-wrapper">
                <span className="register-input-icon"><Lock size={20} /></span>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="กรอกรหัสผ่านที่จำได้ง่าย (4 ตัวขึ้นไป)"
                  className="register-input"
                />
              </div>
            </div>

            <div className="register-form-group">
              <label className="register-label">ยืนยันรหัสผ่าน</label>
              <div className="register-input-wrapper">
                <span className="register-input-icon"><Key size={20} /></span>
                <input
                  type="password"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="กรอกรหัสผ่านอีกครั้ง"
                  className="register-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="register-button"
            >
              {loading ? (
                <>
                  <span className="register-button-spinner"></span>
                  กำลังสมัครสมาชิก...
                </>
              ) : (
                <>
                  <span><UserPlus size={20} /></span>
                  สมัครสมาชิก
                </>
              )}
            </button>

            <div className="register-footer">
              <p className="register-footer-text">
                มีบัญชีอยู่แล้ว?
                <a
                  onClick={onSwitchToLogin}
                  className="register-login-link"
                >
                  เข้าสู่ระบบ
                </a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;