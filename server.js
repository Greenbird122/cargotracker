const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the current directory
app.use(express.static(__dirname));

// Parse JSON bodies
app.use(express.json());

// Main route - serve form.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'form.html'));
});

// Map route - also serve form.html
app.get('/map', (req, res) => {
  res.sendFile(path.join(__dirname, 'form.html'));
});

app.post('/submit', (req, res) => {
  console.log('Form data received:', req.body);
  res.json({ message: 'Data received successfully' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});