const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

let latestLocation = null;

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) res.sendFile(path.join(__dirname, 'form.html'));
    });
});

// GET ROUTE for ESP32
app.get('/api/location', async (req, res) => {
    const { device_id, lat, lng, battery } = req.query;

    if (!device_id || !lat || !lng) {
        return res.status(400).json({ error: 'Missing device_id, lat, or lng' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    // .upsert creates the record if it is missing!
    const { data, error } = await supabase
        .from('devices')
        .upsert({ 
            id: device_id, 
            lat: latitude, 
            lng: longitude, 
            battery: battery ? parseInt(battery) : null,
            last_updated: new Date() 
        }, { onConflict: 'id' })
        .select();

    if (error) {
        console.error('❌ Supabase Error:', error.message);
        return res.status(500).json({ error: error.message });
    }

    console.log(`✅ Success: ${device_id} is now in the database.`);
    
    latestLocation = { device_id, lat: latitude, lng: longitude, timestamp: new Date() };
    res.json({ status: 'ok', database_record: data });
});

app.get('/health', (req, res) => res.send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
