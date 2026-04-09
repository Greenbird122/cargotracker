// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

// Store latest location (in memory, use database for production)
let latestLocation = {
  device_id: 'TAG001',
  lat: -1.2921,
  lng: 36.8219,
  timestamp: Date.now()
};

// Endpoint for tracker to POST location
app.post('/api/location', (req, res) => {
  const { device_id, lat, lng, battery } = req.body;
  latestLocation = {
    device_id,
    lat,
    lng,
    battery,
    timestamp: Date.now()
  };
  console.log(`Received location: ${lat}, ${lng}`);
  res.json({ status: 'ok' });
});

// Endpoint for web page to GET latest location
app.get('/api/location', (req, res) => {
  res.json(latestLocation);
});

// Serve the map page
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/map.html');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
