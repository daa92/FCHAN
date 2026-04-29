const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const socketio = require('socket.io');
require('dotenv').config();

// Import database connection
const db = require('./config/db');

// Initialize express app
const app = express();
const server = http.createServer(app);
const io = socketio(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// ─── MIDDLEWARE ───────────────────────────────────────
app.use(helmet());         // security headers
app.use(cors());           // allow frontend to talk to backend
app.use(morgan('dev'));     // log every request in terminal
app.use(express.json());   // parse incoming JSON data

// ─── SOCKET.IO ────────────────────────────────────────
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io accessible to routes later
app.set('io', io);

// ─── ROUTES ───────────────────────────────────────────
// We will add routes here as we build each phase // this comment has been set at the beginning
// As far as we go through phases, it may not be longer important
const authRoutes = require('./routes/auth'); // authentication route_phase2
const farmRoutes = require('./routes/farm'); // farm, zone and plant_phase3
const sensorRoutes = require('./routes/sensors'); // arduino sensors or manually data entry routes_phase4

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to FCHAN API',
    version: '1.0.0'
  });
});

app.use('/api/auth', authRoutes); // authentication route_phase2
app.use('/api/farm', farmRoutes);
app.use('/api/sensors', sensorRoutes);
// ─── 404 HANDLER ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// ─── ERROR HANDLER ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    success: false,
    message: 'Internal server error'
  });
});

// ─── START SERVER ─────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`FCHAN server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});
