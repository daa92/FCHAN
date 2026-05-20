const express = require('express');
const router = express.Router();
const {
  getSensors, getSensor, createSensor, updateSensor, deleteSensor,
  getReadings, getLatestReading, getStats, createReading, ingestReading
} = require('../controllers/sensorController');
const { auth } = require('../middleware/auth');

// ─── PUBLIC ROUTE ─────────────────────────────────────
router.post('/readings/ingest', ingestReading);

router.use(auth);

// ─── SPECIFIC ROUTES FIRST ────────────────────────────
router.get('/zone/:zoneId', getSensors);

// Readings - specific paths before /:id
router.get('/:id/readings/latest', getLatestReading);
router.get('/:id/readings/stats', getStats);
router.get('/:id/readings', getReadings);
router.post('/:id/readings', createReading);

// Sensor CRUD
router.get('/:id', getSensor);
router.post('/zone/:zoneId', createSensor);
router.put('/:id', updateSensor);
router.delete('/:id', deleteSensor);

module.exports = router;
