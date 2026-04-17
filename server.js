// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static HTML files (index.html, form.html) from the current directory
app.use(express.static(__dirname));

// Initialize Supabase using Environment Variables from Render
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

let latestLocation = null;

// --- Serve the UI ---
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      res.sendFile(path.join(__dirname, 'form.html'));
    }
  });
});

// --- TRACKER ENDPOINT (GET) ---
// Use this for ESP32: http://your-app.onrender.com/api/location?device_id=TULIA001&lat=-1.2&lng=36.8
app.get('/api/location', async (req, res) => {
  const { device_id, lat, lng, battery, source } = req.query;

  // 1. Validate incoming data
  if (!device_id || !lat || !lng) {
    console.log("⚠️ Incomplete data received:", req.query);
    return res.status(400).json({ error: 'Missing device_id, lat, or lng' });
  }

  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const batteryLevel = battery ? parseInt(battery) : null;

  // 2. Database Operation: UPSERT (Create or Update)
  const { data, error } = await supabase
    .from('devices')
    .upsert({
      id: device_id,       // Ensure your Primary Key in Supabase is 'id'
      lat: latitude,
      lng: longitude,
      battery: batteryLevel,
      last_updated: new Date()
    }, { onConflict: 'id' })
    .select();

  // 3. Log results to Render Console
  if (error) {
    console.error('❌ Supabase Error:', error.message);
    return res.status(500).json({ error: 'Database update failed', details: error.message });
  }

  console.log(`✅ Success! ${device_id} updated: ${latitude}, ${longitude} (${source || 'GPS'})`);

  latestLocation = {
    device_id,
    lat: latitude,
    lng: longitude,
    battery: batteryLevel,
    source: source || 'unknown',
    timestamp: new Date().toISOString()
  };

  res.json({ status: 'ok', database: data });
});

// --- API for Frontend to get the latest marker ---
app.get('/api/latest', (req, res) => {
  res.json(latestLocation || { message: 'No data received yet' });
});

// Health check for Render
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Tulia Tag Server running on port ${PORT}`);
});
