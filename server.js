const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// --- Middleware ---
app.use(cors());
// CRITICAL: This allows the server to parse JSON data sent in a POST request body
app.use(express.json()); 
app.use(express.static(__dirname));

// --- Supabase Setup ---
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_SERVICE_KEY
);

// Global variable for real-time dashboard updates (optional)
let latestLocation = null;

// --- Routes ---

/**
 * Main Web Interface
 */
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'), (err) => {
        if (err) res.sendFile(path.join(__dirname, 'form.html'));
    });
});

/**
 * POST /api/esp32
 * Receives hardware data from Pipedream and updates Supabase
 */
app.post('/api/esp32', async (req, res) => {
    // In a POST request, data is sent in the 'body' rather than the URL query
    const { device_id, lat, lng, status } = req.body;

    // Basic Validation
    if (!device_id || lat === undefined || lng === undefined) {
        console.error('⚠️ Received incomplete POST data:', req.body);
        return res.status(400).json({ error: 'Missing device_id, lat, or lng' });
    }

    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    try {
        // .upsert: If device_id exists, update it. If not, create it.
        const { data, error } = await supabase
            .from('devices')
            .upsert({ 
                id: device_id, 
                lat: latitude, 
                lng: longitude, 
                status: status || 'ONLINE', // Default to ONLINE if status is missing
                last_updated: new Date() 
            }, { onConflict: 'id' })
            .select();

        if (error) throw error;

        console.log(`✅ POST Success: ${device_id} is at ${latitude}, ${longitude} [${status}]`);
        
        // Update the local tracker variable
        latestLocation = { device_id, lat: latitude, lng: longitude, status, timestamp: new Date() };

        res.status(200).json({ 
            status: 'ok', 
            message: 'Database updated successfully',
            record: data 
        });

    } catch (err) {
        console.error('❌ Supabase Error:', err.message);
        res.status(500).json({ error: 'Database insertion failed' });
    }
});

/**
 * Health Check (Used by Render to keep the service alive)
 */
app.get('/health', (req, res) => res.status(200).send('Server is Live'));

// --- Server Execution ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Tulia Tag Backend running on port ${PORT}`);
    console.log(`📡 Listening for POST requests at /api/esp32`);
});
