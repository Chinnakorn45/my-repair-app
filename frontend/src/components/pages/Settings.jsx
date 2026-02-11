import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { Upload, Save } from 'lucide-react';
import '../AdminDashboard.css'; // Reuse generic styles or create Settings.css

const Settings = () => {
    const [logo, setLogo] = useState(null);
    const [preview, setPreview] = useState(null);
    const [currentLogo, setCurrentLogo] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCurrentLogo();
    }, []);

    const fetchCurrentLogo = async () => {
        try {
            const res = await fetch('http://localhost:5000/api/settings/logo');
            const data = await res.json();
            if (data.hasLogo) {
                // Add timestamp to prevent caching
                setCurrentLogo(`http://localhost:5000${data.logoUrl}?t=${Date.now()}`);
            }
        } catch (error) {
            console.error('Error fetching logo:', error);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (!file.type.startsWith('image/')) {
                Swal.fire('Error', 'Please select an image file', 'error');
                return;
            }
            setLogo(file);
            setPreview(URL.createObjectURL(file));
        }
    };

    const handleUpload = async () => {
        if (!logo) {
            Swal.fire('Warning', 'Please select a file first', 'warning');
            return;
        }

        const formData = new FormData();
        formData.append('logo', logo);

        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/settings/logo', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                Swal.fire('Success', 'Logo updated successfully', 'success');
                fetchCurrentLogo(); // Refresh current logo
                setLogo(null);
                setPreview(null);
            } else {
                throw new Error('Upload failed');
            }
        } catch (error) {
            console.error('Error uploading logo:', error);
            Swal.fire('Error', 'Failed to upload logo', 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="settings-container fade-in">
            <div className="settings-card">
                <div className="setting-header">
                    <h2>ตั้งค่าระบบ (System Settings)</h2>
                    <p>จัดการการตั้งค่าต่างๆ ของระบบแจ้งซ่อม</p>
                </div>

                <div className="setting-section">
                    <h3 className="section-title"><Upload size={20} /> โลโก้หน้าเข้าสู่ระบบ</h3>
                    <p className="section-desc">
                        อัปโหลดรูปภาพเพื่อเปลี่ยนโลโก้ในหน้าเข้าสู่ระบบดิจิทัล รองรับไฟล์นามสกุล .png และ .jpg
                        <br />ขนาดที่แนะนำ: 500x500 พิกเซล
                    </p>

                    <div className="logo-upload-area">
                        <div className="logo-preview-container">
                            <div className="preview-box-wrapper">
                                <span className="preview-label">โลโก้ปัจจุบัน</span>
                                <div className="logo-preview-box">
                                    {currentLogo ? (
                                        <img src={currentLogo} alt="Current Logo" className="logo-img" />
                                    ) : (
                                        <div className="default-logo-placeholder">SRU</div>
                                    )}
                                </div>
                            </div>

                            {preview && (
                                <div className="preview-box-wrapper">
                                    <span className="preview-label">ตัวอย่างใหม่</span>
                                    <div className="logo-preview-box" style={{ borderColor: '#3b82f6', background: '#eff6ff' }}>
                                        <img src={preview} alt="New Preview" className="logo-img preview" />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="upload-controls">
                            <label className="file-input-wrapper">
                                <input type="file" accept="image/*" onChange={handleFileChange} hidden />
                                <div className="btn-select-file">
                                    <Upload size={18} /> เลือกรูปภาพ...
                                </div>
                            </label>

                            {logo && <span className="file-name">ไฟล์ที่เลือก: {logo.name}</span>}
                        </div>

                        <div className="action-row">
                            <button
                                className="btn-save-logo"
                                onClick={handleUpload}
                                disabled={loading || !logo}
                            >
                                {loading ? 'กำลังบันทึก...' : <><Save size={20} /> บันทึกโลโก้</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
