import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Megaphone, Trash2, Plus, Calendar } from 'lucide-react';
import './Notifications.css'; // Reuse existing styles or create new
import API_URL from '../../config/api';

const AnnouncementManager = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(true);

    // Initial Popup State
    const [popupActive, setPopupActive] = useState(false);
    const [popupText, setPopupText] = useState('');
    const [popupImage, setPopupImage] = useState(null);
    const [popupPreview, setPopupPreview] = useState(null);

    useEffect(() => {
        fetchAnnouncements();
        fetchPopupSettings();
    }, []);

    const fetchAnnouncements = async () => {
        try {
            const res = await fetch(API_URL + '/api/announcements');
            const data = await res.json();
            setAnnouncements(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error(err);
            setAnnouncements([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchPopupSettings = async () => {
        try {
            const res = await fetch(API_URL + '/api/popup');
            const data = await res.json();
            if (data) {
                setPopupActive(data.active);
                setPopupText(data.text);
                if (data.image_url) {
                    setPopupPreview(`${API_URL}${data.image_url}`);
                }
            }
        } catch (err) {
            console.error("Error fetching popup settings:", err);
        }
    };

    const handlePopupSave = async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('active', popupActive);
        formData.append('text', popupText);
        if (popupImage) {
            formData.append('image', popupImage);
        }
        // Send current image url if no new image to keep it? 
        // Backend logic handles this if we don't send 'image' field, it keeps old one? 
        // Actually my backend logic needs improvement to keep old image if not provided.
        // Let's assume user uploads new one or we handle it in backend. 
        // Wait, backend logic: let image_url = req.body.current_image_url;
        // So I need to send current_image_url.
        if (popupPreview && !popupImage) {
            const currentPath = popupPreview.replace(API_URL, '');
            formData.append('current_image_url', currentPath);
        }

        try {
            const res = await fetch(API_URL + '/api/popup', {
                method: 'POST',
                body: formData
            });
            if (res.ok) {
                Swal.fire('บันทึกสำเร็จ', 'ตั้งค่า Popup เรียบร้อยแล้ว', 'success');
                fetchPopupSettings();
            } else {
                Swal.fire('ข้อผิดพลาด', 'บันทึกไม่สำเร็จ', 'error');
            }
        } catch (err) {
            Swal.fire('ข้อผิดพลาด', 'เชื่อมต่อเซิร์ฟเวอร์ไม่ได้', 'error');
        }
    };

    const handlePost = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        try {
            const user_id = localStorage.getItem('user_id');
            const res = await fetch(API_URL + '/api/announcements', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content, user_id })
            });

            if (res.ok) {
                Swal.fire('สำเร็จ', 'ประกาศข่าวสารเรียบร้อยแล้ว', 'success');
                setTitle('');
                setContent('');
                fetchAnnouncements();
            }
        } catch (err) {
            Swal.fire('ข้อผิดพลาด', 'ไม่สามารถสร้างประกาศได้', 'error');
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'ยืนยันการลบ?',
            text: "คุณต้องการลบประกาศนี้หรือไม่?",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'ลบ',
            cancelButtonText: 'ยกเลิก'
        });

        if (result.isConfirmed) {
            try {
                await fetch(`${API_URL}/api/announcements/${id}`, { method: 'DELETE' });
                setAnnouncements(prev => prev.filter(a => a.id !== id));
                Swal.fire('ลบสำเร็จ', '', 'success');
            } catch (err) {
                Swal.fire('ข้อผิดพลาด', 'ลบไม่สำเร็จ', 'error');
            }
        }
    };

    return (
        <div className="notifications-page">
            <div className="notifications-header">
                <h1><Megaphone size={32} className="icon-gap" /> จัดการข่าวสาร/ประกาศ</h1>
            </div>

            {/* Manage Popup Section */}
            <div className="announcement-form-card" style={{ background: '#f0f9ff', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px', border: '1px solid #bae6fd' }}>
                <h3 style={{ marginBottom: '15px', color: '#0284c7' }}>จัดการ Popup หน้า Login/Dashboard</h3>
                <form onSubmit={handlePopupSave}>
                    <div style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontWeight: 'bold' }}>สถานะ:</label>
                        <label className="switch">
                            <input
                                type="checkbox"
                                checked={popupActive}
                                onChange={e => setPopupActive(e.target.checked)}
                            />
                            <span className="slider round"></span>
                        </label>
                        <span>{popupActive ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}</span>
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>ข้อความใน Popup (ไม่บังคับ)</label>
                        <input
                            type="text"
                            value={popupText}
                            onChange={e => setPopupText(e.target.value)}
                            className="search-input"
                            style={{ width: '100%', padding: '10px' }}
                            placeholder="เช่น ยินดีต้อนรับสู่ระบบแจ้งซ่อม..."
                        />
                    </div>

                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>รูปภาพ Popup</label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={e => {
                                const file = e.target.files[0];
                                setPopupImage(file);
                                if (file) {
                                    setPopupPreview(URL.createObjectURL(file));
                                }
                            }}
                            className="search-input"
                            style={{ width: '100%', padding: '10px' }}
                        />
                        {popupPreview && (
                            <div style={{ marginTop: '10px' }}>
                                <img src={popupPreview} alt="Popup Preview" style={{ maxWidth: '200px', borderRadius: '8px', border: '1px solid #ccc' }} />
                            </div>
                        )}
                    </div>

                    <button type="submit" className="new-repair-submit-btn" style={{ width: 'auto', padding: '10px 20px', background: '#0284c7' }}>
                        <Plus size={20} /> บันทึกการตั้งค่า Popup
                    </button>
                </form>
            </div>

            <div className="announcement-form-card" style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', marginBottom: '20px' }}>
                <h3 style={{ marginBottom: '15px' }}>สร้างประกาศใหม่ (News Feed)</h3>
                <form onSubmit={handlePost}>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>หัวข้อประกาศ</label>
                        <input
                            type="text"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="search-input"
                            style={{ width: '100%', padding: '10px' }}
                            placeholder="เช่น แจ้งปิดระบบปรับปรุงประจำปี..."
                            required
                        />
                    </div>
                    <div style={{ marginBottom: '15px' }}>
                        <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>รายละเอียด</label>
                        <textarea
                            value={content}
                            onChange={e => setContent(e.target.value)}
                            className="new-repair-textarea"
                            style={{ width: '100%', padding: '10px', minHeight: '100px' }}
                            placeholder="รายละเอียดข่าวสาร..."
                            required
                        />
                    </div>
                    <button type="submit" className="new-repair-submit-btn" style={{ width: 'auto', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Plus size={20} /> โพสต์ประกาศ
                    </button>
                </form>
            </div>

            <div className="notifications-list">
                <h3>ประกาศที่ผ่านมา ({announcements.length})</h3>
                {loading ? <p>กำลังโหลด...</p> : announcements.map(news => (
                    <div key={news.id} className="notification-item" style={{ cursor: 'default' }}>
                        <div className="notification-icon">📢</div>
                        <div className="notification-content">
                            <div className="notification-title">{news.title}</div>
                            <div className="notification-message">{news.content}</div>
                            <div className="notification-time" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '5px' }}>
                                <Calendar size={12} /> {new Date(news.created_at).toLocaleString('th-TH')}
                            </div>
                        </div>
                        <button className="delete-btn" onClick={() => handleDelete(news.id)}>
                            <Trash2 size={18} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AnnouncementManager;
