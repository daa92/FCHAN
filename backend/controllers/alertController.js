const Alert = require('../models/Alert');
const AlertThreshold = require('../models/AlertThreshold');
const { checkAlerts } = require('../services/alerts');

// GET /api/alerts/farm/:farmId
const getAlerts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const alerts = await Alert.findByFarmId(req.params.farmId, limit);
    return res.status(200).json({ success: true, alerts });
  } catch (err) {
    console.error('GetAlerts error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// GET /api/alerts/farm/:farmId/unread
const getUnreadAlerts = async (req, res) => {
  try {
    const alerts = await Alert.findUnread(req.params.farmId);
    const count = await Alert.countUnread(req.params.farmId);
    return res.status(200).json({ success: true, count, alerts });
  } catch (err) {
    console.error('GetUnreadAlerts error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/alerts/:id/read
const markAsRead = async (req, res) => {
  try {
    await Alert.markAsRead(req.params.id);
    return res.status(200).json({ success: true, message: 'Alert marked as read.' });
  } catch (err) {
    console.error('MarkAsRead error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/alerts/farm/:farmId/read-all
const markAllAsRead = async (req, res) => {
  try {
    await Alert.markAllAsRead(req.params.farmId);
    return res.status(200).json({ success: true, message: 'All alerts marked as read.' });
  } catch (err) {
    console.error('MarkAllAsRead error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/alerts/:id/resolve
const markAsResolved = async (req, res) => {
  try {
    await Alert.markAsResolved(req.params.id);
    return res.status(200).json({ success: true, message: 'Alert resolved.' });
  } catch (err) {
    console.error('MarkAsResolved error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ─── THRESHOLDS ───────────────────────────────────────

// GET /api/alerts/thresholds/zone/:zoneId
const getThresholds = async (req, res) => {
  try {
    const thresholds = await AlertThreshold.findByZoneId(req.params.zoneId);
    return res.status(200).json({ success: true, thresholds });
  } catch (err) {
    console.error('GetThresholds error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/alerts/thresholds/zone/:zoneId
const createThreshold = async (req, res) => {
  try {
    const { sensor_type, min_value, max_value } = req.body;
    if (!sensor_type) {
      return res.status(400).json({
        success: false,
        message: 'sensor_type is required.'
      });
    }
    const id = await AlertThreshold.create({
      zone_id: req.params.zoneId,
      sensor_type, min_value, max_value
    });
    return res.status(201).json({
      success: true,
      message: 'Threshold created.',
      id
    });
  } catch (err) {
    console.error('CreateThreshold error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// PUT /api/alerts/thresholds/:id
const updateThreshold = async (req, res) => {
  try {
    const { min_value, max_value } = req.body;
    await AlertThreshold.update(req.params.id, { min_value, max_value });
    return res.status(200).json({ success: true, message: 'Threshold updated.' });
  } catch (err) {
    console.error('UpdateThreshold error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// DELETE /api/alerts/thresholds/:id
const deleteThreshold = async (req, res) => {
  try {
    await AlertThreshold.delete(req.params.id);
    return res.status(200).json({ success: true, message: 'Threshold deleted.' });
  } catch (err) {
    console.error('DeleteThreshold error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// POST /api/alerts/check (manually trigger alerts check)
const triggerCheck = async (req, res) => {
  try {
    const io = req.app.get('io');
    await checkAlerts(io);
    return res.status(200).json({
      success: true,
      message: 'Alerts check triggered successfully.'
    });
  } catch (err) {
    console.error('TriggerCheck error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getAlerts, getUnreadAlerts,
  markAsRead, markAllAsRead, markAsResolved,
  getThresholds, createThreshold, updateThreshold, deleteThreshold,
  triggerCheck
};
