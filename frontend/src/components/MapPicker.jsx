import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet';
import './MapPicker.css';

// Coordinates for Suan Sunandha Rajabhat University Suratthani
const UNIVERSITY_CENTER = [9.08375, 99.36870];
const UNIVERSITY_BOUNDS = [
  [9.0750, 99.3550], // Southwest corner
  [9.0925, 99.3823]  // Northeast corner
];

export default function MapPicker({ position, setPosition, onLocationUpdate, existingRequests = [] }) {
  const [locationDetails, setLocationDetails] = useState(null);
  const [nearestBuilding, setNearestBuilding] = useState(null);
  const [mapLayer, setMapLayer] = useState('map'); // 'map' or 'satellite'
  const markerRef = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    // Auto-detect user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const newPos = { lat: latitude, lng: longitude };
          setPosition(newPos);

          // Get location details from database and OpenStreetMap
          fetchLocationDetails(latitude, longitude);
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  const fetchLocationDetails = async (lat, lng) => {
    try {
      // 1. ค้นหาตึกที่ใกล้ที่สุดจากฐานข้อมูลก่อน
      let buildingData = null;
      try {
        const buildingResponse = await fetch(
          `http://localhost:5000/api/buildings/nearest?lat=${lat}&lng=${lng}`
        );
        const buildingResult = await buildingResponse.json();

        if (buildingResult.found) {
          buildingData = buildingResult.building;
          setNearestBuilding(buildingResult.building);
        } else {
          setNearestBuilding(null);
        }
      } catch (error) {
        console.log('Building search error:', error);
        setNearestBuilding(null);
      }

      // 2. ดึงข้อมูลจาก OpenStreetMap (สำรอง)
      let osmData = null;
      try {
        const osmResponse = await fetch(
          `http://localhost:5000/api/location/details?lat=${lat}&lon=${lng}`
        );
        osmData = await osmResponse.json();
      } catch (error) {
        console.log('OpenStreetMap fetch error:', error);
      }

      // 3. รวมข้อมูล: ใช้ข้อมูลตึกจากฐานข้อมูลเป็นหลัก และข้อมูล OpenStreetMap เป็นเสริม
      const combinedDetails = {
        ...osmData,
        // ถ้ามีข้อมูลตึกจากฐานข้อมูล ให้ใช้ชื่อตึกจากฐานข้อมูล
        building: buildingData ? buildingData.name : (osmData?.building || 'ไม่ระบุชื่อตึก'),
        buildingFromDB: buildingData || null,
        // ถ้ามีข้อมูลตึก ให้ใช้คณะ/หน่วยงานจากฐานข้อมูล
        faculty: buildingData?.faculty || null
      };

      setLocationDetails(combinedDetails);

      // Open popup automatically
      setTimeout(() => {
        if (markerRef.current) {
          markerRef.current.openPopup();
        }
      }, 100);

      if (onLocationUpdate) {
        onLocationUpdate(combinedDetails);
      }
    } catch (error) {
      console.log('Location details fetch error:', error);
    }
  };

  function LocationMarker() {
    useMapEvents({
      click(e) {
        setPosition(e.latlng);
        fetchLocationDetails(e.latlng.lat, e.latlng.lng);
      },
    });
    return position ? (
      <Marker position={position} ref={markerRef}>
        {locationDetails && (
          <Popup>
            <div className="map-picker-popup">
              <div className="map-picker-popup-title">📍 ตำแหน่งที่เลือก</div>
              <div className="map-picker-popup-detail">
                <strong>ชื่อตึก:</strong> {locationDetails.building || 'ไม่ระบุชื่อตึก'}
              </div>
              {locationDetails.street && (
                <div className="map-picker-popup-detail">
                  <strong>ถนน:</strong> {locationDetails.street}
                </div>
              )}
              {locationDetails.area && (
                <div className="map-picker-popup-detail">
                  <strong>พื้นที่:</strong> {locationDetails.area}
                </div>
              )}
              {nearestBuilding && (
                <div className="map-picker-popup-detail">
                  <strong>🏛️ คณะ/หน่วยงาน:</strong> {nearestBuilding.faculty || 'ไม่ระบุ'}
                </div>
              )}
              {locationDetails.displayName && (
                <div className="map-picker-popup-address">
                  <strong>ที่อยู่:</strong> {locationDetails.displayName}
                </div>
              )}
            </div>
          </Popup>
        )}
      </Marker>
    ) : null;
  }

  // ✅ แสดงจุดแจ้งซ่อมเดิม (Pending / In Progress)
  function ExistingMarkers() {
    if (!existingRequests || existingRequests.length === 0) return null;

    return existingRequests.map((req) => (
      <Marker
        key={req.request_id}
        position={[req.lat, req.lng]}
        eventHandlers={{
          click: () => {
            // Optional: Handle click if needed
          },
        }}
      >
        <Popup>
          <div className="map-picker-popup">
            <div className="map-picker-popup-title">🔧 กำลังดำเนินการซ่อม</div>
            <div className="map-picker-popup-detail">
              <strong>สถานะ:</strong> {req.status === 'pending' ? 'รอดำเนินการ' : 'กำลังซ่อม'}
            </div>
            <div className="map-picker-popup-detail">
              <strong>รายละเอียด:</strong> {req.description}
            </div>
            <div className="map-picker-popup-detail">
              <strong>สถานที่:</strong> {req.building_name}
            </div>
          </div>
        </Popup>
      </Marker>
    ));
  }

  return (
    <>
      <div className="map-picker-controls">
        <button
          className={`map-picker-layer-btn ${mapLayer === 'map' ? 'active' : ''}`}
          onClick={() => setMapLayer('map')}
          title="แผนที่ปกติ"
        >
          🗺️ แผนที่
        </button>
        <button
          className={`map-picker-layer-btn ${mapLayer === 'satellite' ? 'active' : ''}`}
          onClick={() => setMapLayer('satellite')}
          title="ดาวเทียม"
        >
          🛰️ ดาวเทียม
        </button>
      </div>
      <div className="map-picker-wrapper">
        <MapContainer
          center={UNIVERSITY_CENTER}
          zoom={16}
          className="map-picker-map"
          maxBounds={UNIVERSITY_BOUNDS}
          maxBoundsViscosity={1.0}
          ref={mapRef}
        >
          {mapLayer === 'map' ? (
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
          ) : (
            <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" attribution='Tiles &copy; Esri' />
          )}
          <LocationMarker />
          <ExistingMarkers />
        </MapContainer>
      </div>
    </>
  );
}