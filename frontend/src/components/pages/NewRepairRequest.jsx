import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { FileText, Camera, MapPin, Search } from 'lucide-react';
import MapPicker from "../MapPicker";
import './NewRepairRequest.css';
import API_URL from '../../config/api';

function NewRepairRequest({ userId, onCancel }) {
  const [desc, setDesc] = useState('');
  const [pos, setPos] = useState(null);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [locationDetails, setLocationDetails] = useState(null);
  const [nearestBuilding, setNearestBuilding] = useState(null);
  const [buildingLoading, setBuildingLoading] = useState(false);

  // ✅ 1. ค้นหาตึกที่ใกล้ที่สุดอัตโนมัติเมื่อตำแหน่ง (pos) เปลี่ยน
  useEffect(() => {
    const fetchNearestBuilding = async () => {
      if (!pos || !pos.lat || !pos.lng) {
        setNearestBuilding(null);
        return;
      }

      setBuildingLoading(true);
      try {
        const response = await fetch(
          `${API_URL}/api/buildings/nearest?lat=${pos.lat}&lng=${pos.lng}`
        );
        const data = await response.json();

        if (data.found) {
          setNearestBuilding(data.building);
        } else {
          setNearestBuilding(null);
        }
      } catch (error) {
        console.error('Error fetching nearest building:', error);
        setNearestBuilding(null);
      } finally {
        setBuildingLoading(false);
      }
    };

    fetchNearestBuilding();
  }, [pos]);

  // ✅ 2. จัดการการเลือกรูปภาพและแสดงตัวอย่าง (Preview)
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setFilePreview(URL.createObjectURL(selectedFile));
    }
  };

  // ✅ 3. ฟังก์ชันส่งข้อมูลแจ้งซ่อม
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!desc.trim()) return Swal.fire('แจ้งเตือน', 'กรุณากรอกรายละเอียดการซ่อม', 'warning');
    if (!pos) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกตำแหน่งในแผนที่', 'warning');
    if (!file) return Swal.fire('แจ้งเตือน', 'กรุณาแนบรูปภาพความเสียหาย', 'warning');

    setLoading(true);
    const formData = new FormData();
    formData.append('user_id', userId);
    formData.append('description', desc);
    formData.append('lat', pos.lat);
    formData.append('lng', pos.lng);
    if (nearestBuilding?.id) {
      formData.append('building_id', nearestBuilding.id);
    }
    formData.append('image', file);

    try {
      const response = await fetch(API_URL + '/api/repair-requests', {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer ' + localStorage.getItem('token')
        },
        body: formData
      });

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'ส่งแจ้งซ่อมสำเร็จ!',
          text: 'เราได้รับข้อมูลการแจ้งซ่อมของคุณแล้ว',
          timer: 2000,
          showConfirmButton: false
        });

        // Reset Form
        setDesc('');
        setPos(null);
        setFile(null);
        setFilePreview(null);
        setNearestBuilding(null);
        setLocationDetails(null);

        if (onCancel) onCancel(); // กลับหน้าหลัก (ถ้ามี)
      } else {
        const errData = await response.json();
        Swal.fire('เกิดข้อผิดพลาด', errData.message || 'ไม่สามารถส่งข้อมูลได้', 'error');
      }
    } catch (error) {
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Fetch Active Requests for Map
  const [activeRequests, setActiveRequests] = useState([]);

  useEffect(() => {
    const fetchActiveRequests = async () => {
      try {
        const response = await fetch(API_URL + '/api/repair-requests/public/in-progress');
        if (response.ok) {
          const data = await response.json();
          const validRequests = data.filter(req => req.lat && req.lng); // Filter out invalid coords
          setActiveRequests(validRequests);
        }
      } catch (error) {
        console.error("Error fetching active requests:", error);
      }
    };
    fetchActiveRequests();
  }, []);

  return (
    <div className="new-repair-page">
      <div className="new-repair-card">
        <div className="new-repair-header">
          <h1 className="new-repair-title"><FileText size={32} className="icon-gap" /> แจ้งซ่อมใหม่</h1>
        </div>

        <form onSubmit={handleSubmit}>
          {/* แผนที่เลือกตำแหน่ง */}
          <div className="new-repair-form-group">
            <label className="new-repair-label">ระบุตำแหน่งบนแผนที่</label>
            <div className="map-picker-container">
              <MapPicker
                position={pos}
                setPosition={setPos}
                onLocationUpdate={setLocationDetails}
                existingRequests={activeRequests}
              />
            </div>

            {pos && (
              <div className="new-repair-position-info">
                <MapPin size={16} className="icon-gap" /> พิกัด: {pos.lat.toFixed(6)}, {pos.lng.toFixed(6)}
              </div>
            )}

            {/* สถานะการค้นหาตึก */}
            {buildingLoading && (
              <div className="new-repair-building-info"><Search size={16} className="icon-gap" /> กำลังค้นหาข้อมูลตึก...</div>
            )}

            {/* แสดงข้อมูลตำแหน่งที่ดึงมาได้ */}
            {(nearestBuilding || locationDetails) && !buildingLoading && (
              <div className="new-repair-location-details">
                <div className="new-repair-building-header"><MapPin size={16} className="icon-gap" /> ข้อมูลสถานที่แจ้งซ่อม</div>

                <div className="new-repair-detail-row">
                  <strong>อาคาร/ตึก:</strong> {nearestBuilding?.name || locationDetails?.building || 'ไม่พบข้อมูลตึกในระบบ'}
                </div>

                {(locationDetails?.street || locationDetails?.area) && (
                  <div className="new-repair-detail-row">
                    <strong>บริเวณ:</strong> {locationDetails.street} {locationDetails.area}
                  </div>
                )}

                {locationDetails?.displayName && (
                  <div className="new-repair-address-row">
                    <strong>ที่อยู่เต็ม:</strong> {locationDetails.displayName}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* รายละเอียดปัญหา */}
          <div className="new-repair-form-group">
            <label className="new-repair-label">รายละเอียดการเสีย *</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              required
              placeholder="อธิบายปัญหาที่เกิดขึ้น เช่น หลอดไฟทางเดินชั้น 2 ดับ..."
              className="new-repair-textarea"
            />
          </div>

          {/* ส่วนอัปโหลดรูปภาพ */}
          <div className="new-repair-form-group">
            <label className="new-repair-label">รูปภาพความเสียหาย *</label>
            <div className="new-repair-file-wrapper">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="new-repair-file-input"
                id="file-input"
              />
              <label htmlFor="file-input" className="new-repair-file-trigger">
                {filePreview ? (
                  // ✅ เพิ่ม Container ครอบรูปภาพ
                  <div className="image-preview-container">
                    <img src={filePreview} alt="Preview" className="image-preview-on-form" />
                  </div>
                ) : (
                  <div className="upload-placeholder">
                    <span className="icon"><Camera size={32} /></span>
                    <span className="text">คลิกเพื่อถ่ายรูปหรือเลือกรูปภาพ</span>
                  </div>
                )}
              </label>
            </div>
            {file && <div className="file-success-text">✓ เลือกไฟล์เรียบร้อย: {file.name}</div>}
          </div>

          {/* ปุ่มควบคุม */}
          <div className="new-repair-button-group">
            <button
              type="submit"
              disabled={loading || !desc.trim() || !pos || !file}
              className="new-repair-submit-btn"
            >
              {loading ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลแจ้งซ่อม'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="new-repair-cancel-btn"
            >
              ยกเลิก
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default NewRepairRequest;