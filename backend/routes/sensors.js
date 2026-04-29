const express = require('express');
const router = express.Router();
const {
  getSensors, getSensor, createSensor, updateSensor, deleteSensor,
  getReadings, getLatestReading, getStats, createReading, ingestReading
} = require('../controllers/sensorController');
const { auth } = require('../middleware/auth');

// ─── PUBLIC ROUTE (Arduino uses this) ─────────────────
// No auth required - Arduino authenticates via api_key
router.post('/readings/ingest', ingestReading);

// ─── PROTECTED ROUTES ─────────────────────────────────
router.use(auth);

// Sensor CRUD - Create Read Update Delete
router.get('/zone/:zoneId', getSensors);
router.get('/:id', getSensor);
router.post('/zone/:zoneId', createSensor);
router.put('/:id', updateSensor);
router.delete('/:id', deleteSensor);

// Readings
router.get('/:id/readings', getReadings);
router.get('/:id/readings/latest', getLatestReading);
router.get('/:id/readings/stats', getStats);
router.post('/:id/readings', createReading);

module.exports = router;
