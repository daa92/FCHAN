const express  = require('express');
const router   = express.Router();
const { sendFeedback } = require('../controllers/feedbackController');
const { auth } = require('../middleware/auth');

router.use(auth);
router.post('/', sendFeedback);

module.exports = router;
