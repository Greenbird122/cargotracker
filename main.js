const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// Serve the dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Serve the update form
app.get('/update', (req, res) => {
    res.sendFile(path.join(__dirname, 'form.html'));
});

// Hardware Data Intake Endpoint (supports both JSON and form data)
app.post('/update-location', (req, res) => {
    // Handle both JSON and form-urlencoded data
    const { cargoId, lat, lng, altitude, speed } = req.body;

    if (!cargoId || lat === undefined || lng === undefined) {
        return res.status(400).json({ 
            error: 'Missing required fields. Need: cargoId, lat, lng' 
        });
    }

    const payload = { 
        cargoId, 
        lat: parseFloat(lat), 
        lng: parseFloat(lng), 
        altitude: altitude ? parseInt(altitude) : 35000,
        speed: speed ? parseInt(speed) : 500,
        timestamp: new Date() 
    };

    // Real-time Broadcast to all connected Web Dashboards
    io.emit('cargo-update', payload);
    
    console.log(`✅ Update received for ${cargoId}: ${lat}, ${lng}`);
    
    // Return a nice HTML response for form submissions
    if (req.accepts('html')) {
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="refresh" content="2;url=/update">
                <style>
                    body { font-family: Arial; text-align: center; padding: 50px; background: #1a1a1a; color: white; }
                    .success { color: #00ff00; font-size: 24px; margin: 20px; }
                    .loading { color: #ffa500; }
                </style>
            </head>
            <body>
                <div class="success">✅ Location Updated Successfully!</div>
                <div class="loading">Redirecting back to form...</div>
                <p>Cargo ${cargoId} now at ${lat}, ${lng}</p>
            </body>
            </html>
        `);
    }
    
    res.status(200).json({ status: 'Broadcast successful' });
});

io.on('connection', (socket) => {
    console.log('📊 Dashboard Connected:', socket.id);
});

server.listen(PORT, () => {
    console.log(`
    🚀 Cargo Server Running!
    ========================
    📊 Dashboard: http://localhost:${PORT}
    📝 Update Form: http://localhost:${PORT}/update
    `);
});