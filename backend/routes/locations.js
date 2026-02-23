const express = require('express');
const pool = require('../database');

const router = express.Router();

// API: ดึงชื่อตำแหน่งจากพิกัด (Reverse Geocoding)
router.get('/details', async (req, res) => {
  const { lat, lon, lng } = req.query;
  const longitude = lon || lng;

  if (!lat || !longitude) {
    return res.status(400).json({ error: 'Missing lat or lon parameter' });
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${longitude}`,
      { headers: { 'User-Agent': 'RepairApp/1.0' } }
    );
    const data = await response.json();

    // Try to get building name from various possible fields
    const buildingName =
      data.address?.building ||
      data.address?.name ||
      data.address?.amenity ||
      data.address?.shop ||
      data.address?.office ||
      data.address?.house_name ||
      data.address?.tourism ||
      'ไม่ระบุชื่อตึก';

    const locationDetails = {
      address: data.address,
      displayName: data.display_name,
      building: buildingName,
      street: data.address?.road || data.address?.street || 'ไม่ระบุถนน',
      area: data.address?.suburb || data.address?.neighbourhood || 'ไม่ระบุพื้นที่'
    };

    res.json(locationDetails);
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
