const express = require('express');
const router  = express.Router();
const {
  getUsers, sendMessage,
  getBroadcasts, getPrivateMessages, getUnreadCounts,
  createRoom, getRooms, getRoomMessages
} = require('../controllers/chatController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/users',                  getUsers);
router.post('/send',                  sendMessage);
router.get('/broadcast',              getBroadcasts);
router.get('/private/:userId',        getPrivateMessages);
router.get('/unread',                 getUnreadCounts);
router.post('/rooms',                 createRoom);
router.get('/rooms',                  getRooms);
router.get('/rooms/:roomId/messages', getRoomMessages);

module.exports = router;
