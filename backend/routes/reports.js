const express = require('express');
const router = express.Router();
const { downloadReport } = require('../controllers/reportController');
const { auth } = require('../middleware/auth');

router.use(auth);

// GET /api/reports/farm/:farmId
router.get('/farm/:farmId', downloadReport);

module.exports = router;
