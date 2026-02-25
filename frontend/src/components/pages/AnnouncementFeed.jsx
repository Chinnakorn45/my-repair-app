import { useState, useEffect } from 'react';
import { Megaphone, Calendar } from 'lucide-react';
import './Notifications.css';
import API_URL from '../../config/api';

const AnnouncementFeed = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                const res = await fetch(API_URL + '/api/announcements');
                if (!res.ok) throw new Error('Failed to fetch announcements');
                const data = await res.json();
                setAnnouncements(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error("Error fetching announcements:", err);
                setAnnouncements([]);
            } finally {
                setLoading(false);
            }
        };
        fetchNews();
    }, []);

    return (
        <div className="notifications-page">
            <div className="notifications-header">
                <h1><Megaphone size={32} className="icon-gap" /> ข่าวสารและประกาศจากระบบ</h1>
            </div>

            <div className="notifications-list">
                {loading ? (
                    <p>กำลังโหลดข่าวสาร...</p>
                ) : announcements.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">📭</div>
                        <p>ยังไม่มีประกาศข่าวสาร</p>
                    </div>
                ) : (
                    announcements.map(news => (
                        <div key={news.id} className="notification-item" style={{ cursor: 'default', borderLeft: '4px solid #4169E1' }}>
                            <div className="notification-icon" style={{ background: '#e3f2fd', color: '#1976d2' }}>
                                📢
                            </div>
                            <div className="notification-content">
                                <div className="notification-title" style={{ color: '#1565c0', fontSize: '16px' }}>{news.title}</div>
                                <div className="notification-message" style={{ fontSize: '14px', marginTop: '5px', color: '#333' }}>
                                    {news.content}
                                </div>
                                <div className="notification-time" style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '8px', color: '#666' }}>
                                    <Calendar size={14} /> {new Date(news.created_at).toLocaleString('th-TH')}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default AnnouncementFeed;
