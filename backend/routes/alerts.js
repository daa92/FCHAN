const express = require('express');
const router = express.Router();
const {
  getAlerts, getUnreadAlerts,
  markAsRead, markAllAsRead, markAsResolved,
  getThresholds, createThreshold, updateThreshold, deleteThreshold,
  triggerCheck
} = require('../controllers/alertController');
const { auth } = require('../middleware/auth');

router.use(auth);

// ─── ALERTS ───────────────────────────────────────────
router.get('/farm/:farmId', getAlerts);
router.get('/farm/:farmId/unread', getUnreadAlerts);
router.put('/:id/read', markAsRead);
router.put('/farm/:farmId/read-all', markAllAsRead);
router.put('/:id/resolve', markAsResolved);

// ─── THRESHOLDS ───────────────────────────────────────
router.get('/thresholds/zone/:zoneId', getThresholds);
router.post('/thresholds/zone/:zoneId', createThreshold);
router.put('/thresholds/:id', updateThreshold);
router.delete('/thresholds/:id', deleteThreshold);

// ─── MANUAL TRIGGER (for testing) ─────────────────────
router.post('/check', triggerCheck);

module.exports = router;
