const express      = require('express');
const router       = express.Router();
const {
  getSensors, getSensor, createSensor, updateSensor, deleteSensor,
  getReadings, getLatestReading, getStats, createReading, ingestReading
} = require('../controllers/sensorController');
const { auth }       = require('../middleware/auth');
const sensorAccess   = require('../middleware/sensorAccess');

// ─── PUBLIC ROUTE ─────────────────────────────────────
router.post('/readings/ingest', ingestReading);

router.use(auth);

// ─── SPECIFIC ROUTES FIRST ────────────────────────────
router.get('/zone/:zoneId',      sensorAccess(false), getSensors);

// Readings
router.get('/:id/readings/latest', sensorAccess(false), getLatestReading);
router.get('/:id/readings/stats',  sensorAccess(false), getStats);
router.get('/:id/readings',        sensorAccess(false), getReadings);
router.post('/:id/readings',       sensorAccess(true),  createReading);

// Sensor CRUD
router.get('/:id',            sensorAccess(false), getSensor);
router.post('/zone/:zoneId',  sensorAccess(true),  createSensor);
router.put('/:id',            sensorAccess(true),  updateSensor);
router.delete('/:id',         sensorAccess(true),  deleteSensor);

module.exports = router;
