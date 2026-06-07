const express = require('express');
const router  = express.Router();
const {
  getUsers, sendMessage,
  getBroadcasts, getPrivateMessages, getUnreadCounts,
  createRoom, getRooms, getRoomMessages,
  updateRoom, deleteRoom, getRoomMembers, addRoomMember, removeRoomMember
} = require('../controllers/chatController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.get('/users',                          getUsers);
router.post('/send',                          sendMessage);
router.get('/broadcast',                      getBroadcasts);
router.get('/private/:userId',                getPrivateMessages);
router.get('/unread',                         getUnreadCounts);
router.post('/rooms',                         createRoom);
router.get('/rooms',                          getRooms);
router.get('/rooms/:roomId/messages',         getRoomMessages);
router.put('/rooms/:roomId',                  updateRoom);
router.delete('/rooms/:roomId',               deleteRoom);
router.get('/rooms/:roomId/members',          getRoomMembers);
router.post('/rooms/:roomId/members',         addRoomMember);
router.delete('/rooms/:roomId/members/:uid',  removeRoomMember);

module.exports = router;
