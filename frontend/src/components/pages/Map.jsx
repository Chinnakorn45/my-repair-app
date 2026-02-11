import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import './Map.css';

// ตั้งค่า Leaflet Icon
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: shadowUrl,
});

// Custom Icon สำหรับสถานะต่างๆ
const createCustomIcon = (status) => {
  const colors = {
    'pending': '#FFA500',
    'in_progress': '#4169E1',
    'completed': '#32CD32',
    'pending_approval': '#FFD700'
  };
  const color = colors[status] || '#808080';

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 30px;
        height: 30px;
        border-radius: 50% 50% 50% 0;
        border: 3px solid white;
        transform: rotate(-45deg);
        box-shadow: 0 3px 6px rgba(0,0,0,0.3);
      ">
        <div style="
          transform: rotate(45deg);
          margin-top: 5px;
          margin-left: 8px;
          color: white;
          font-size: 16px;
        ">📍</div>
      </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42]
  });
};

// Component สำหรับบินไปยังตำแหน่งที่เลือก
const MapFollower = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center)) {
      map.flyTo(center, 16, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

const translateStatus = (status) => {
  const statusMap = {
    'pending': 'รอรับเรื่อง',
    'in_progress': 'กำลังดำเนินการ',
    'completed': 'ซ่อมเสร็จสิ้น',
    'pending_approval': 'รออนุมัติ'
  };
  return statusMap[status] || status;
};

const Map = () => {
  const [allRepairs, setAllRepairs] = useState([]);
  const [filteredRepairs, setFilteredRepairs] = useState([]);
  const [userLocation, setUserLocation] = useState([9.1472, 99.3134]);
  const [selectedRepair, setSelectedRepair] = useState(null);
  const [mapLayer, setMapLayer] = useState('map');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showRoute, setShowRoute] = useState(false);
  const [stats, setStats] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);

  // ดึงข้อมูลผู้ใช้ และ Role
  const getUserInfo = () => {
    let id = localStorage.getItem('user_id');
    const role = localStorage.getItem('user_role') || 'user';

    if (!id || id === 'undefined' || id === 'null') {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          id = payload.user_id?.toString();
          if (id) localStorage.setItem('user_id', id);
        } catch (e) { console.error('Token error', e); }
      }
    }
    return { id: (id && id !== 'undefined') ? id : null, role };
  };

  const { id: userId, role: userRole } = getUserInfo();

  // ดึงข้อมูลงานซ่อมทั้งหมด
  const fetchRepairs = async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      let url = `http://localhost:5000/api/repair-requests/${userId}`;
      if (userRole === 'technician') {
        url = `http://localhost:5000/api/technician/tasks`;
      } else if (userRole === 'admin' || userRole === 'supervisor') {
        url = `http://localhost:5000/api/admin/tasks`;
      }

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('เกิดข้อผิดพลาด');

      const data = await response.json();

      if (Array.isArray(data)) {
        // Normalize data
        const normalizedData = data.map(item => ({
          ...item,
          request_id: item.request_id || item.id, // Ensure request_id exists
        }));

        setAllRepairs(normalizedData);
        setFilteredRepairs(normalizedData);

        // คำนวณสถิติ
        const s = normalizedData.reduce((acc, curr) => {
          acc.total++;
          if (curr.status === 'pending') acc.pending++;
          else if (curr.status === 'in_progress') acc.in_progress++;
          else if (curr.status === 'completed') acc.completed++;
          return acc;
        }, { total: 0, pending: 0, in_progress: 0, completed: 0 });
        setStats(s);
      }
    } catch (error) {
      console.error('Error fetching repairs:', error);
    } finally {
      setLoading(false);
    }
  };

  // ดึงตำแหน่งผู้ใช้
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (error) => console.log("Using default location"),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
    fetchRepairs();
  }, [userId]);

  // กรองข้อมูลตามสถานะ
  useEffect(() => {
    if (filterStatus === 'all') {
      setFilteredRepairs(allRepairs);
    } else {
      setFilteredRepairs(allRepairs.filter(r => r.status === filterStatus));
    }
  }, [filterStatus, allRepairs]);

  // คำนวณระยะทาง
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // รัศมีของโลกในหน่วย km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return (R * c).toFixed(2);
  };

  // เลือกงานและแสดงเส้นทาง
  const handleSelectRepair = (repair) => {
    setSelectedRepair(repair);
    setShowRoute(true);
    setUserLocation(prev => [...prev]); // Trigger map update
  };

  return (
    <div className="map-page">
      {/* Header Stats */}
      <div className="map-header">
        <h2 className="map-title">🗺️ แผนที่งานซ่อมทั้งหมด</h2>
        <div className="map-stats-row">
          <div className="map-stat-card">
            <div className="map-stat-value">{stats.total}</div>
            <div className="map-stat-label">ทั้งหมด</div>
          </div>
          <div className="map-stat-card orange">
            <div className="map-stat-value">{stats.pending}</div>
            <div className="map-stat-label">รอรับเรื่อง</div>
          </div>
          <div className="map-stat-card blue">
            <div className="map-stat-value">{stats.in_progress}</div>
            <div className="map-stat-label">กำลังดำเนินการ</div>
          </div>
          <div className="map-stat-card green">
            <div className="map-stat-value">{stats.completed}</div>
            <div className="map-stat-label">เสร็จสิ้น</div>
          </div>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="map-controls">
        <div className="map-filter-group">
          <label>🔍 กรองตามสถานะ:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="map-filter-select"
          >
            <option value="all">ทั้งหมด ({stats.total})</option>
            <option value="pending">รอรับเรื่อง ({stats.pending})</option>
            <option value="in_progress">กำลังดำเนินการ ({stats.in_progress})</option>
            <option value="completed">เสร็จสิ้น ({stats.completed})</option>
          </select>
        </div>

        <div className="map-layer-btns">
          <button
            className={`map-layer-btn ${mapLayer === 'map' ? 'active' : ''}`}
            onClick={() => setMapLayer('map')}
          >
            🗺️ แผนที่
          </button>
          <button
            className={`map-layer-btn ${mapLayer === 'satellite' ? 'active' : ''}`}
            onClick={() => setMapLayer('satellite')}
          >
            🛰️ ดาวเทียม
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="map-content">
        {/* Sidebar - รายการงานซ่อม */}
        <div className="map-sidebar">
          <h3 className="sidebar-title">📋 รายการงานซ่อม ({filteredRepairs.length})</h3>
          <div className="repair-list">
            {loading ? (
              <div className="loading-state">กำลังโหลด...</div>
            ) : filteredRepairs.length === 0 ? (
              <div className="empty-state">ไม่พบข้อมูล</div>
            ) : (
              filteredRepairs.map((repair) => (
                <div
                  key={repair.request_id}
                  className={`repair-item ${selectedRepair?.request_id === repair.request_id ? 'active' : ''}`}
                  onClick={() => handleSelectRepair(repair)}
                >
                  <div className="repair-item-header">
                    <span className="repair-id">#{repair.request_id}</span>
                    <span className={`repair-status status-${repair.status}`}>
                      {translateStatus(repair.status)}
                    </span>
                  </div>
                  <div className="repair-item-desc">{repair.description}</div>
                  {repair.building_name && (
                    <div className="repair-item-location">🏢 {repair.building_name}</div>
                  )}
                  {repair.lat && repair.lng && (
                    <div className="repair-item-distance">
                      📍 ระยะทาง: {calculateDistance(
                        userLocation[0],
                        userLocation[1],
                        parseFloat(repair.lat),
                        parseFloat(repair.lng)
                      )} km
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Map Container */}
        <div className="map-container">
          <MapContainer
            center={userLocation}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
          >
            <MapFollower center={selectedRepair ? [parseFloat(selectedRepair.lat), parseFloat(selectedRepair.lng)] : userLocation} />

            {mapLayer === 'map' ? (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
            ) : (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; Esri'
              />
            )}

            {/* หมุดตำแหน่งผู้ใช้ */}
            <Marker position={userLocation}>
              <Popup>
                <div className="popup-content">
                  <strong>📍 คุณอยู่ที่นี่</strong>
                </div>
              </Popup>
            </Marker>

            {/* หมุดจุดแจ้งซ่อม */}
            {filteredRepairs.map((repair) => (
              repair.lat && repair.lng && (
                <Marker
                  key={repair.request_id}
                  position={[parseFloat(repair.lat), parseFloat(repair.lng)]}
                  icon={createCustomIcon(repair.status)}
                  eventHandlers={{
                    click: () => handleSelectRepair(repair)
                  }}
                >
                  <Popup>
                    <div className="popup-content">
                      <div className="popup-header">
                        <strong>🔧 #{repair.request_id}</strong>
                        <span className={`popup-status status-${repair.status}`}>
                          {translateStatus(repair.status)}
                        </span>
                      </div>
                      <div className="popup-desc">{repair.description}</div>
                      {repair.building_name && (
                        <div className="popup-building">🏢 {repair.building_name}</div>
                      )}
                      <div className="popup-distance">
                        📍 ระยะทาง: {calculateDistance(
                          userLocation[0],
                          userLocation[1],
                          parseFloat(repair.lat),
                          parseFloat(repair.lng)
                        )} km
                      </div>
                      {repair.created_at && (
                        <div className="popup-date">
                          📅 {new Date(repair.created_at).toLocaleDateString('th-TH')}
                        </div>
                      )}

                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${repair.lat},${repair.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="navigate-btn"
                      >
                        🚗 นำทาง (Google Maps)
                      </a>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}

            {/* เส้นทาง */}
            {showRoute && selectedRepair && selectedRepair.lat && selectedRepair.lng && (
              <Polyline
                positions={[
                  userLocation,
                  [parseFloat(selectedRepair.lat), parseFloat(selectedRepair.lng)]
                ]}
                color="#4169E1"
                weight={4}
                opacity={0.7}
                dashArray="10, 10"
              />
            )}
          </MapContainer>

          {/* Clear Route Button */}
          {showRoute && selectedRepair && (
            <button
              className="clear-route-btn"
              onClick={() => {
                setShowRoute(false);
                setSelectedRepair(null);
              }}
            >
              ✕ ล้างเส้นทาง
            </button>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#FFA500' }}></div>
          <span>รอรับเรื่อง</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#4169E1' }}></div>
          <span>กำลังดำเนินการ</span>
        </div>
        <div className="legend-item">
          <div className="legend-color" style={{ backgroundColor: '#32CD32' }}></div>
          <span>เสร็จสิ้น</span>
        </div>
      </div>
    </div>
  );
};

export default Map;