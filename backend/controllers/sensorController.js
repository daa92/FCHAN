const Sensor = require('../models/Sensor');
const Reading = require('../models/Reading');
const crypto = require('crypto');

// ─── SENSORS ──────────────────────────────────────────

// GET /api/farm/:farmId/zones/:zoneId/sensors
const getSensors = async (req, res) => {
  try {
    const sensors = await Sensor.findByZoneId(req.params.zoneId);
    return res.status(200).json({ success: true, sensors });
  } catch (err) {
    console.error('GetSensors error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/sensors/:id
const getSensor = async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found.' });
    }
    return res.status(200).json({ success: true, sensor });
  } catch (err) {
    console.error('GetSensor error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/farm/:farmId/zones/:zoneId/sensors
const createSensor = async (req, res) => {
  try {
    const { name, type, unit, connection_type } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Sensor name and type are required.'
      });
    }

    // Generate unique API key for WiFi/auto sensors
    const api_key = crypto.randomBytes(32).toString('hex');

    const sensorId = await Sensor.create({
      zone_id: req.params.zoneId,
      name, type, unit,
      connection_type,
      api_key
    });

    const sensor = await Sensor.findById(sensorId);
    return res.status(201).json({
      success: true,
      message: 'Sensor created.',
      sensor
    });
  } catch (err) {
    console.error('CreateSensor error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/sensors/:id
const updateSensor = async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found.' });
    }
    const { name, type, unit, connection_type, is_active } = req.body;
    if (!name || !type) {
      return res.status(400).json({
        success: false,
        message: 'Sensor name and type are required.'
      });
    }
    await Sensor.update(req.params.id, {
      name, type, unit, connection_type,
      is_active: is_active !== undefined ? is_active : sensor.is_active
    });
    const updatedSensor = await Sensor.findById(req.params.id);
    return res.status(200).json({
      success: true,
      message: 'Sensor updated.',
      sensor: updatedSensor
    });
  } catch (err) {
    console.error('UpdateSensor error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// DELETE /api/sensors/:id
const deleteSensor = async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found.' });
    }
    await Sensor.delete(req.params.id);
    return res.status(200).json({ success: true, message: 'Sensor deleted.' });
  } catch (err) {
    console.error('DeleteSensor error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── READINGS ─────────────────────────────────────────

// GET /api/sensors/:id/readings
const getReadings = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const readings = await Reading.findBySensorId(req.params.id, limit);
    return res.status(200).json({ success: true, readings });
  } catch (err) {
    console.error('GetReadings error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/sensors/:id/readings/latest
const getLatestReading = async (req, res) => {
  try {
    const reading = await Reading.findLatest(req.params.id);
    if (!reading) {
      return res.status(404).json({
        success: false,
        message: 'No readings found for this sensor.'
      });
    }
    return res.status(200).json({ success: true, reading });
  } catch (err) {
    console.error('GetLatestReading error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/sensors/:id/readings/stats
const getStats = async (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const stats = await Reading.getAverage(req.params.id, hours);
    const hourly = await Reading.getHourlyData(req.params.id, hours);
    return res.status(200).json({
      success: true,
      stats,
      hourly_data: hourly
    });
  } catch (err) {
    console.error('GetStats error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/sensors/:id/readings
// Manual entry (by user via GUI)
const createReading = async (req, res) => {
  try {
    const sensor = await Sensor.findById(req.params.id);
    if (!sensor) {
      return res.status(404).json({ success: false, message: 'Sensor not found.' });
    }
    const { value, recorded_at } = req.body;
    if (value === undefined || value === null) {
      return res.status(400).json({ success: false, message: 'Value is required.' });
    }
    const readingId = await Reading.create({
      sensor_id: req.params.id,
      value,
      entered_by: 'manual',
      recorded_at: recorded_at || new Date()
    });

    // Update sensor last seen
    await Sensor.updateLastSeen(req.params.id);

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    io.emit(`sensor:${req.params.id}`, { value, recorded_at: recorded_at || new Date() });

    const reading = await Reading.findLatest(req.params.id);
    return res.status(201).json({
      success: true,
      message: 'Reading recorded.',
      reading
    });
  } catch (err) {
    console.error('CreateReading error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/readings/ingest
// Auto entry (by Arduino/ESP32 via API key)
const ingestReading = async (req, res) => {
  try {
    const { api_key, value, recorded_at } = req.body;

    if (!api_key || value === undefined) {
      return res.status(400).json({
        success: false,
        message: 'api_key and value are required.'
      });
    }

    // Find sensor by API key
    const sensor = await Sensor.findByApiKey(api_key);
    if (!sensor) {
      return res.status(401).json({
        success: false,
        message: 'Invalid API key or sensor inactive.'
      });
    }

    // Save reading
    await Reading.create({
      sensor_id: sensor.id,
      value,
      entered_by: 'auto',
      recorded_at: recorded_at || new Date()
    });

    // Update sensor last seen
    await Sensor.updateLastSeen(sensor.id);

    // Emit real-time update via Socket.io
    const io = req.app.get('io');
    io.emit(`sensor:${sensor.id}`, { value, recorded_at: recorded_at || new Date() });

    return res.status(201).json({
      success: true,
      message: 'Reading ingested successfully.'
    });
  } catch (err) {
    console.error('IngestReading error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getSensors, getSensor, createSensor, updateSensor, deleteSensor,
  getReadings, getLatestReading, getStats, createReading, ingestReading
};
