// server.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Serve static HTML files from the current directory
app.use(express.static(__dirname));

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

let latestLocation = null;

// --- Serve the main HTML page when someone visits the root URL ---
app.get('/', (req, res) => {
  // Try to serve index.html first, if not found, serve form.html
  res.sendFile(path.join(__dirname, 'index.html'), (err) => {
    if (err) {
      // If index.html doesn't exist, try form.html
      res.sendFile(path.join(__dirname, 'form.html'));
    }
  });
});

// --- MODIFIED ROUTE: Now handles GET requests with URL parameters ---
// Example: https://tulia-tag-app.onrender.com/api/location?device_id=TULIA001&lat=-1.28&lng=36.82&battery=85
app.get('/api/location', async (req, res) => {
  // Pull data from req.query (the URL parameters)
  const { device_id, lat, lng, battery } = req.query;

  // 1. Validation check
  if (!device_id || !lat || !lng) {
    console.log("⚠️ Received incomplete data via URL:", req.query);
    return res.status(400).json({ error: 'Missing device_id, lat, or lng in URL' });
  }

  // 2. Format data (URL parameters are strings, so we convert them to numbers)
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lng);
  const batteryLevel = battery ? parseInt(battery) : null;

  latestLocation = {
    device_id,
    lat: latitude,
    lng: longitude,
    battery: batteryLevel,
    timestamp: new Date().toISOString()
  };

  console.log(`📍 Data received from ${device_id}: ${latitude}, ${longitude}`);

  // 3. Update Supabase
  const { error } = await supabase
    .from('devices')
    .update({
      lat: latitude,
      lng: longitude,
      battery: batteryLevel,
      last_updated: new Date()
    })
    .eq('id', device_id);

  if (error) {
    console.error('Supabase update error:', error);
    return res.status(500).json({ error: 'Database update failed' });
  }

  // 4. Send success response back to ESP32
  res.json({ status: 'ok', data: latestLocation });
});

// Optional: Endpoint to get the latest location (for your frontend)
app.get('/api/latest', (req, res) => {
  res.json(latestLocation || { message: 'No data yet' });
});

// Health check
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Tulia Tag Gateway running on port ${PORT}`);
});
