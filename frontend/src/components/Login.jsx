import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { User, Lock, Eye, EyeOff, LogIn } from 'lucide-react';
import './Login.css';

function Login({ onLoginSuccess, onSwitchToRegister }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState(null);

  useEffect(() => {
    fetchLogo();
  }, []);

  const fetchLogo = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/settings/logo');
      const data = await res.json();
      if (data.hasLogo) {
        setLogoUrl(`http://localhost:5000${data.logoUrl}?t=${Date.now()}`);
      }
    } catch (err) {
      console.error("Error fetching logo", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user_id', data.user_id);
      localStorage.setItem('user_role', data.role);

      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('savedUsername', username);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('savedUsername');
      }

      onLoginSuccess(data.user_id, data.role);
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">

          <div className="logo-section">
            {logoUrl ? (
              <img src={logoUrl} alt="Logo" className="login-logo-img" />
            ) : (
              <div className="logo-box">SRU</div>
            )}
          </div>

          <h1 className="login-title">ยินดีต้อนรับสู่ระบบแจ้งซ่อม มรส.</h1>
          <p className="login-subtitle">มหาวิทยาลัยราชภัฎสุราษฎร์ธานี</p>

          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleSubmit} className="login-form">

            <div className="form-group">
              <label className="form-label">ชื่อผู้ใช้งาน</label>
              <div className="input-wrapper">
                <span className="input-icon"><User size={20} /></span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  className="form-input"
                  placeholder="Username หรือ รหัสนักศึกษา/บุคลากร"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">รหัสผ่าน</label>
              <div className="input-wrapper">
                <span className="input-icon"><Lock size={20} /></span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="form-input"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="toggle-password"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="form-footer">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="checkbox-input"
                />
                <span>จดจำฉัน</span>
              </label>

              <a
                href="#"
                className="forgot-password"
                onClick={(e) => {
                  e.preventDefault();
                  Swal.fire({
                    icon: 'info',
                    title: 'ลืมรหัสผ่าน?',
                    text: 'กรุณาติดต่อเจ้าหน้าที่ที่หมายเลข 0-7791-3333 ต่อ 5100',
                    confirmButtonText: 'ตกลง'
                  });
                }}
              >
                ลืมรหัสผ่าน?
              </a>
            </div>

            <button type="submit" disabled={loading} className="login-button">
              <span><LogIn size={20} /></span> {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
            </button>
          </form>

          <div className="register-section">
            <p className="register-text">
              ยังไม่มีบัญชี?{' '}
              <a onClick={onSwitchToRegister} className="register-link">
                สมัครสมาชิก
              </a>
            </p>
          </div>

          <div className="support-section">
            <p className="support-text">
              หากพบปัญหาการใช้งาน ติดต่อสำนักวิทยบริการฯ
            </p>
            <p className="support-phone">โทร: 0-7791-3333 ต่อ 5100</p>
            <p className="support-website">
              <a href="https://www.sru.ac.th" target="_blank" rel="noopener noreferrer">
                www.sru.ac.th
              </a>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Login;