import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { MapPin, Layers, Globe, Clock, CheckCircle } from 'lucide-react';
import './Dashboardhome.css';
import '../MapPicker.css'; // Reuse MapPicker styles for consistency

// --- Leaflet Icon Fix ---
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

// --- Constants (Same as MapPicker) ---
const UNIVERSITY_CENTER = [9.08375, 99.36870];
const UNIVERSITY_BOUNDS = [
  [9.0750, 99.3550], // Southwest corner
  [9.0925, 99.3823]  // Northeast corner
];

// --- Colored Standard Markers ---
const getColoredMarkerIcon = (status) => {
  let color = 'blue';
  if (status === 'pending') color = 'orange';
  else if (status === 'in_progress') color = 'blue';
  else if (status === 'completed') color = 'green';
  else if (status === 'pending_approval') color = 'gold';

  return new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: shadowUrl,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
};

const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// --- Helper Components ---
const MapFollower = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center && Array.isArray(center)) {
      map.flyTo(center, 16, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
};

// Auto-fit bounds including all markers + university bounds
const MapBounds = ({ markers }) => {
  const map = useMap();
  useEffect(() => {
    if (markers && markers.length > 0) {
      const bounds = L.latLngBounds(markers.map(m => [m.lat, m.lng]));
      // Extend bounds to include university center to ensure context
      bounds.extend(UNIVERSITY_CENTER);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [markers, map]);
  return null;
};

const translateStatus = (status) => {
  const statusMap = {
    'pending': 'รอดำเนินการ',
    'in_progress': 'กำลังดำเนินการ',
    'completed': 'ซ่อมเสร็จสิ้น',
    'pending_approval': 'รออนุมัติ'
  };
  return statusMap[status] || status;
};

const DashboardHome = ({ userId: propUserId }) => {
  const [allRepairs, setAllRepairs] = useState([]);
  const [stats, setStats] = useState({ pending: 0, in_progress: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [userLocation, setUserLocation] = useState(UNIVERSITY_CENTER);
  const [locationLoading, setLocationLoading] = useState(true);
  const [mapLayer, setMapLayer] = useState('map');

  const [userRole, setUserRole] = useState('user');

  const getUserId = () => {
    if (propUserId) return propUserId;
    let id = localStorage.getItem('user_id');
    // ... (same token parsing logic)
    if (!id || id === 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          id = payload.user_id?.toString();
          if (id) localStorage.setItem('user_id', id);
        } catch (e) { }
      }
    }
    return id;
  };

  const userId = getUserId();

  const fetchData = async () => {
    if (!userId) {
      setErrorMessage("❌ ไม่พบรหัสผู้ใช้");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');

      // ✅ ตรวจสอบ token ก่อน fetch
      if (!token) {
        console.error("❌ No token found, redirecting to login");
        localStorage.removeItem('token');
        localStorage.removeItem('user_id');
        localStorage.removeItem('user_role');
        window.location.href = '/login';
        return;
      }

      const role = localStorage.getItem('user_role') || 'user'; // Get Role
      setUserRole(role); // Update state

      let userRepairs = [];
      let unassignedCount = 0;

      if (role === 'technician') {
        // 1. If Technician -> Fetch Assigned Tasks
        const response = await fetch(`http://localhost:5000/api/technician/tasks`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401) {
          console.error("❌ Token expired or invalid, redirecting to login");
          localStorage.removeItem('token');
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_role');
          window.location.href = '/login';
          return;
        }
        if (!response.ok) throw new Error("ดึงข้อมูลงานซ่อมไม่สำเร็จ");
        userRepairs = await response.json();

        // 2. Fetch Unassigned Count for "Pending" Stat
        try {
          const unassignedRes = await fetch(`http://localhost:5000/api/repair-requests/unassigned`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (unassignedRes.ok) {
            const data = await unassignedRes.json();
            unassignedCount = data.count;
          }
        } catch (e) {
          console.error("Error fetching unassigned count:", e);
        }
      } else {
        // 2. If User/Admin -> Fetch Reported Tasks (Original Logic)
        const response = await fetch(`http://localhost:5000/api/repair-requests/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error("ดึงข้อมูลไม่สำเร็จ");
        userRepairs = await response.json();
      }

      // 3. Get Public Active Repairs
      let publicRepairs = [];
      try {
        const pubRes = await fetch(`http://localhost:5000/api/repair-requests/public/in-progress`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (pubRes.ok) publicRepairs = await pubRes.json();
      } catch (e) {
        console.warn("Public repairs fetch failed", e);
      }

      // 4. Merge and Calculate Stats
      const repairMap = new Map();
      if (Array.isArray(userRepairs)) {
        userRepairs.forEach(r => repairMap.set(r.request_id, r));

        const s = userRepairs.reduce((acc, curr) => {
          if (curr.status === 'pending') acc.pending++;
          else if (curr.status === 'in_progress') acc.in_progress++;
          else if (curr.status === 'completed') acc.completed++;
          return acc;
        }, { pending: 0, in_progress: 0, completed: 0 });

        // ✅ FIX: For technicians, use the fetched unassigned count for "Pending"
        if (role === 'technician') {
          s.pending = unassignedCount;
        }

        setStats(s);
      }

      if (Array.isArray(publicRepairs)) {
        publicRepairs.forEach(r => {
          if (!repairMap.has(r.request_id)) repairMap.set(r.request_id, r);
        });
      }

      setAllRepairs(Array.from(repairMap.values()));

    } catch (error) {
      console.error(error);
      setErrorMessage(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (navigator.geolocation) {
      setLocationLoading(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
          setLocationLoading(false);
        },
        () => setLocationLoading(false),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    }
    fetchData();
  }, [userId]);

  return (
    <div className="dashboard-home">
      {errorMessage && (
        <div className="error-alert-overlay">
          <div className="error-alert-content">
            <p>⚠️ {errorMessage}</p>
            <button className="retry-btn" onClick={() => window.location.reload()}>ลองใหม่</button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid">
        {userRole !== 'user' && (
          <div className="stat-card">
            <div className="stat-icon-wrapper orange"><Clock size={24} color="#FFA500" /></div>
            <div className="stat-content">
              <div className="stat-value">{stats.pending}</div>
              <div className="stat-label">รอดำเนินการ</div>
            </div>
          </div>
        )}
        <div className="stat-card">
          <div className="stat-icon-wrapper blue"><Clock size={24} color="#4169E1" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.in_progress}</div>
            <div className="stat-label">กำลังดำเนินการ</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon-wrapper green"><CheckCircle size={24} color="#32CD32" /></div>
          <div className="stat-content">
            <div className="stat-value">{stats.completed}</div>
            <div className="stat-label">เสร็จสิ้น</div>
          </div>
        </div>
      </div>

      {/* Map Section */}
      <div className="map-section">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '15px' }}>
          <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <MapPin size={24} /> แผนที่จุดแจ้งซ่อม
          </h3>

          <div className="map-picker-controls" style={{ margin: 0 }}>
            <button className={`map-picker-layer-btn ${mapLayer === 'map' ? 'active' : ''}`} onClick={() => setMapLayer('map')}>
              🗺️ แผนที่
            </button>
            <button className={`map-picker-layer-btn ${mapLayer === 'satellite' ? 'active' : ''}`} onClick={() => setMapLayer('satellite')}>
              🛰️ ดาวเทียม
            </button>
          </div>
        </div>

        <div className="map-container-wrapper" style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid #ddd' }}>
          <MapContainer
            center={UNIVERSITY_CENTER}
            zoom={16}
            style={{ height: '450px', width: '100%' }}
            maxBounds={UNIVERSITY_BOUNDS}
            maxBoundsViscosity={1.0}
            scrollWheelZoom={true}
          >
            <MapFollower center={userLocation} />

            {mapLayer === 'map' ? (
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; OpenStreetMap'
              />
            ) : (
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='Tiles &copy; Esri'
              />
            )}

            {/* User Location */}
            <Marker position={userLocation} icon={redIcon}>
              <Popup>
                <div style={{ fontWeight: 'bold' }}>📍 คุณอยู่ที่นี่</div>
              </Popup>
            </Marker>

            {/* Repairs (Filter out completed) */}
            {allRepairs.map((repair) => (
              (repair.lat && repair.lng && repair.status !== 'completed') && (
                <Marker
                  key={repair.request_id}
                  position={[parseFloat(repair.lat), parseFloat(repair.lng)]}
                  icon={getColoredMarkerIcon(repair.status)}
                >
                  <Popup>
                    <div className="map-picker-popup">
                      <div className="map-picker-popup-title">
                        🔧 #{repair.request_id} {translateStatus(repair.status)}
                      </div>
                      <div className="map-picker-popup-detail">
                        <strong>📝</strong> {repair.description}
                      </div>
                      {repair.building_name && (
                        <div className="map-picker-popup-detail">
                          <strong>🏢</strong> {repair.building_name}
                        </div>
                      )}
                      <div className="map-picker-popup-detail" style={{ color: '#666', marginTop: '5px' }}>
                        🕒 {new Date(repair.created_at).toLocaleString('th-TH')}
                      </div>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}

            <MapBounds markers={allRepairs.filter(r => r.lat && r.lng)} />
          </MapContainer>
        </div>

        {/* Legend */}
        <div style={{ marginTop: '12px', display: 'flex', gap: '15px', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FFA500' }}></div>
            <span style={{ fontSize: '12px' }}>รอดำเนินการ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#4169E1' }}></div>
            <span style={{ fontSize: '12px' }}>กำลังดำเนินการ</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#CB2B3E' }}></div>
            <span style={{ fontSize: '12px' }}>ตำแหน่งปัจจุบัน</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;