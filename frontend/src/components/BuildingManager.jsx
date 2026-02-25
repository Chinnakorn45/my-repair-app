import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import {
  Building as BuildingIcon,
  Map as MapIcon,
  Satellite,
  Edit,
  Trash2,
  Save,
  X,
  AlertCircle,
  MapPin,
  ClipboardList
} from 'lucide-react';
import './BuildingManager.css';
import API_URL from '../config/api';

// Fix for default marker icon issue in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom icon for saved buildings
const savedBuildingIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Custom icon for new position
const newPositionIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Coordinates for Suan Sunandha Rajabhat University Suratthani
const UNIVERSITY_CENTER = [9.08375, 99.36870];

export default function BuildingManager() {
  const [position, setPosition] = useState(null);
  const [name, setName] = useState('');
  const [locationDetails, setLocationDetails] = useState(null);
  const [mapLayer, setMapLayer] = useState('map'); // 'map' or 'satellite'
  const [buildings, setBuildings] = useState([]); // รายการตึกที่บันทึกไว้
  const [editingBuilding, setEditingBuilding] = useState(null); // ตึกที่กำลังแก้ไข
  const markerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // โหลดข้อมูลตึกที่บันทึกไว้
    fetchBuildings();

    // Auto-detect user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          // You might want to center the map here, but for now just ready
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  const fetchBuildings = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('No token found');
        return;
      }

      const response = await fetch(API_URL + '/api/buildings', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const normalizedData = data.map(building => ({
          ...building,
          building_id: building.id || building.building_id || building._id
        }));
        setBuildings(normalizedData);
      } else {
        console.error('Failed to fetch buildings:', response.status);
      }
    } catch (error) {
      console.error('Error fetching buildings:', error);
    }
  };

  const fetchLocationDetails = async (lat, lng) => {
    try {
      const response = await fetch(
        `${API_URL}/api/location/details?lat=${lat}&lon=${lng}`
      );
      if (response.ok) {
        const details = await response.json();
        setLocationDetails(details);
        // Auto-fill name if building name is available and not editing
        if (details.building && !name && !editingBuilding) {
          setName(details.building);
        }
      }
    } catch (error) {
      console.log('Location details fetch error:', error);
    }
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        if (!editingBuilding) {
          const { lat, lng } = e.latlng;
          setPosition({ lat, lng });
          fetchLocationDetails(lat, lng);
        }
      },
    });

    return position && !editingBuilding ? (
      <Marker position={position} ref={markerRef} icon={newPositionIcon}>
        <Popup>
          <div className="popup-container">
            <div className="popup-title"><MapPin size={16} /> ตำแหน่งใหม่</div>
            {locationDetails ? (
              <>
                <div className="popup-detail">
                  <strong>ชื่อตึก:</strong> {locationDetails.building || 'ไม่ระบุ'}
                </div>
                <div className="popup-detail">
                  <strong>ถนน:</strong> {locationDetails.street || 'ไม่ระบุ'}
                </div>
                <div className="popup-address">
                  <strong>ที่อยู่:</strong> {locationDetails.displayName || locationDetails.display_name}
                </div>
              </>
            ) : (
              <div className="popup-detail">กำลังโหลดข้อมูล...</div>
            )}
          </div>
        </Popup>
      </Marker>
    ) : null;
  }

  const handleEditBuilding = (building) => {
    setEditingBuilding(building);
    setPosition({ lat: building.lat, lng: building.lng });
    setName(building.name);
    // Optionally focus map
    // if (mapRef.current) mapRef.current.setView([building.lat, building.lng], 18);
  };

  const handleDeleteBuilding = async (id) => {
    const result = await Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "คุณต้องการลบข้อมูลตึกนี้ใช่หรือไม่?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'ใช่, ลบเลย',
      cancelButtonText: 'ยกเลิก'
    });

    if (result.isConfirmed) {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/api/buildings/${id}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          Swal.fire('ลบสำเร็จ!', 'ข้อมูลตึกถูกลบแล้ว', 'success');
          fetchBuildings();
          // Reset if we were editing this one
          if (editingBuilding && editingBuilding.building_id === id) {
            handleCancelEdit();
          }
        } else {
          Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถลบข้อมูลได้', 'error');
        }
      } catch (error) {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
      }
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      Swal.fire('แจ้งเตือน', 'กรุณาระบุชื่อตึก', 'warning');
      return;
    }
    if (!position && !editingBuilding) {
      Swal.fire('แจ้งเตือน', 'กรุณาเลือกตำแหน่งบนแผนที่', 'warning');
      return;
    }

    const payload = {
      name,
      lat: position.lat,
      lng: position.lng
    };

    try {
      const token = localStorage.getItem('token');
      let url = API_URL + '/api/buildings';
      let method = 'POST';

      if (editingBuilding) {
        url = `${API_URL}/api/buildings/${editingBuilding.building_id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        Swal.fire('บันทึกสำเร็จ', 'ข้อมูลตึกถูกบันทึกแล้ว', 'success');
        fetchBuildings();
        handleCancelEdit(); // Reset form
      } else {
        Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถบันทึกข้อมูลได้', 'error');
      }
    } catch (error) {
      console.error(error);
      Swal.fire('เกิดข้อผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'error');
    }
  };

  const handleCancelEdit = () => {
    setEditingBuilding(null);
    setPosition(null);
    setName('');
    setLocationDetails(null);
  };

  return (
    <div className="building-manager-container">

      {/* Summary Stats */}
      <div className="bm-summary-row">
        <div className="bm-summary-card">
          <div className="bm-summary-icon" style={{ background: '#dbeafe', color: '#3b82f6' }}><BuildingIcon size={22} /></div>
          <div className="bm-summary-info">
            <span className="bm-summary-num">{buildings.length}</span>
            <span className="bm-summary-label">ตึกทั้งหมด</span>
          </div>
        </div>
        <div className="bm-summary-card">
          <div className="bm-summary-icon" style={{ background: '#dcfce7', color: '#10b981' }}><MapPin size={22} /></div>
          <div className="bm-summary-info">
            <span className="bm-summary-num">{buildings.filter(b => b.lat && b.lng).length}</span>
            <span className="bm-summary-label">มีพิกัด GPS</span>
          </div>
        </div>
        <div className="bm-summary-card">
          <div className="bm-summary-icon" style={{ background: editingBuilding ? '#fef3c7' : '#f1f5f9', color: editingBuilding ? '#f59e0b' : '#94a3b8' }}><Edit size={22} /></div>
          <div className="bm-summary-info">
            <span className="bm-summary-num">{editingBuilding ? 1 : 0}</span>
            <span className="bm-summary-label">กำลังแก้ไข</span>
          </div>
        </div>
      </div>

      {/* Two-Column: Map + Form */}
      <div className="bm-main-row">
        {/* Left: Map */}
        <div className="bm-map-section">
          <div className="bm-map-header">
            <h3 className="bm-section-title"><MapIcon size={18} /> แผนที่</h3>
            <div className="map-controls">
              <button
                className={`layer-button ${mapLayer === 'map' ? 'active' : ''}`}
                onClick={() => setMapLayer('map')}
              >
                <MapIcon size={15} /> แผนที่
              </button>
              <button
                className={`layer-button ${mapLayer === 'satellite' ? 'active' : ''}`}
                onClick={() => setMapLayer('satellite')}
              >
                <Satellite size={15} /> ดาวเทียม
              </button>
            </div>
          </div>
          <div className="map-wrapper">
            <MapContainer
              center={UNIVERSITY_CENTER}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              ref={mapRef}
            >
              <TileLayer
                url={mapLayer === 'map'
                  ? "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  : "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"}
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <LocationMarker />

              {buildings.map((building) => (
                <Marker
                  key={building.building_id}
                  position={[building.lat, building.lng]}
                  icon={savedBuildingIcon}
                  eventHandlers={{
                    click: () => {
                      if (!editingBuilding) handleEditBuilding(building);
                    }
                  }}
                >
                  <Popup>
                    <div className="popup-container">
                      <div className="popup-title"><BuildingIcon size={16} /> {building.name}</div>
                      <div className="popup-details-row">
                        <strong>ID:</strong> {building.building_id}
                      </div>
                      <div className="popup-actions">
                        <button className="edit-button" onClick={(e) => { e.stopPropagation(); handleEditBuilding(building); }}>
                          <Edit size={14} /> แก้ไข
                        </button>
                        <button className="delete-button" onClick={(e) => { e.stopPropagation(); handleDeleteBuilding(building.building_id); }}>
                          <Trash2 size={14} /> ลบ
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </div>

        {/* Right: Form */}
        <div className="bm-form-section">
          <h3 className="bm-section-title"><Save size={18} /> {editingBuilding ? 'แก้ไขข้อมูลตึก' : 'เพิ่มตึกใหม่'}</h3>

          {editingBuilding && (
            <div className="editing-notice">
              <AlertCircle size={16} className="icon-gap" /> กำลังแก้ไข: <strong>{editingBuilding.name}</strong>
            </div>
          )}

          <div className="form-group">
            <label className="label">ชื่อตึก / สถานที่</label>
            <input
              type="text"
              className="input-field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ระบุชื่อตึก"
            />
          </div>

          {position && (
            <div className="form-group">
              <label className="label">พิกัด</label>
              <div className="coords-display">
                <MapPin size={16} className="icon-gap" /> Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}
              </div>
            </div>
          )}

          {!position && !editingBuilding && (
            <div className="bm-hint">
              <MapPin size={16} /> คลิกบนแผนที่เพื่อเลือกตำแหน่งตึก
            </div>
          )}

          <div className="button-group">
            <button className="save-button" onClick={handleSave}>
              <Save size={16} className="icon-gap" /> {editingBuilding ? 'อัปเดตข้อมูล' : 'บันทึกตึก'}
            </button>
            {editingBuilding && (
              <button className="cancel-button" onClick={handleCancelEdit}>
                <X size={16} className="icon-gap" /> ยกเลิก
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Buildings List */}
      <div className="buildings-list">
        <h3 className="list-title"><ClipboardList size={20} className="icon-gap" /> รายการตึกทั้งหมด ({buildings.length})</h3>
        {buildings.length === 0 ? (
          <p className="empty-message">ยังไม่มีข้อมูลตึก</p>
        ) : (
          <div className="buildings-grid">
            {buildings.map((building, idx) => (
              <div
                key={building.building_id}
                className={`building-card ${editingBuilding?.building_id === building.building_id ? 'active' : ''}`}
                onClick={() => handleEditBuilding(building)}
              >
                <div className="bm-card-accent" style={{ background: `linear-gradient(90deg, ${['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'][idx % 6]}, ${['#60a5fa', '#34d399', '#a78bfa', '#fbbf24', '#f87171', '#22d3ee'][idx % 6]})` }}></div>
                <div className="building-card-header">
                  <h4 className="building-name"><BuildingIcon size={18} className="icon-gap" /> {building.name}</h4>
                  <span className="building-id">#{building.building_id}</span>
                </div>
                <p className="building-coords">
                  <MapPin size={14} className="icon-gap" /> {building.lat.toFixed(5)}, {building.lng.toFixed(5)}
                </p>
                <div className="building-card-actions">
                  <button className="card-edit-button" onClick={(e) => { e.stopPropagation(); handleEditBuilding(building); }}>
                    <Edit size={14} /> แก้ไข
                  </button>
                  <button className="card-delete-button" onClick={(e) => { e.stopPropagation(); handleDeleteBuilding(building.building_id); }}>
                    <Trash2 size={14} /> ลบ
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}