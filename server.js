// server.js
const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Initialize Supabase with service role (bypasses RLS)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Store latest location in memory for quick GET (optional)
let latestLocation = null;

// Endpoint for tracker to POST location
app.post('/api/location', async (req, res) => {
  const { device_id, lat, lng, battery } = req.body;
  
  // Validate required fields
  if (!device_id || lat === undefined || lng === undefined) {
    return res.status(400).json({ error: 'Missing device_id, lat, or lng' });
  }

  latestLocation = {
    device_id,
    lat,
    lng,
    battery: battery || null,
    timestamp: new Date().toISOString()
  };

  console.log(`📍 Tracker ${device_id}: ${lat}, ${lng}`);

  // Forward to Supabase
  const { error } = await supabase
    .from('devices')
    .update({
      lat,
      lng,
      battery: battery || null,
      last_updated: new Date()
    })
    .eq('id', device_id);

  if (error) {
    console.error('Supabase update error:', error);
    // Still return ok to tracker – we logged the error
  }

  res.json({ status: 'ok' });
});

// Optional: GET latest location for debugging
app.get('/api/location', (req, res) => {
  res.json(latestLocation || { message: 'No location received yet' });
});

// Health check
app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Tracker gateway running on port ${PORT}`);
});
