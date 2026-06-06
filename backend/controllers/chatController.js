const db = require('../config/db');

// ── GET ALL USERS (for picking recipients) ────────
const getUsers = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, name, email, avatar FROM users WHERE id != ? ORDER BY name',
      [req.user.id]
    );
    return res.status(200).json({ success: true, users: rows });
  } catch (err) {
    console.error('GetUsers error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── SEND MESSAGE ──────────────────────────────────
const sendMessage = async (req, res) => {
  try {
    const { message, type = 'broadcast', recipient_id, room_id } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
    }

    const msgType = ['broadcast', 'private', 'multicast'].includes(type) ? type : 'broadcast';

    // Validation
    if (msgType === 'private' && !recipient_id) {
      return res.status(400).json({ success: false, message: 'recipient_id required for private messages.' });
    }
    if (msgType === 'multicast' && !room_id) {
      return res.status(400).json({ success: false, message: 'room_id required for group messages.' });
    }

    const [result] = await db.execute(
      `INSERT INTO chat_messages (sender_id, recipient_id, room_id, message, type)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, msgType === 'private' ? recipient_id : null, 
       msgType === 'multicast' ? room_id : null, message.trim(), msgType]
    );

    const [rows] = await db.execute(
      `SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
       FROM chat_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = ?`,
      [result.insertId]
    );

    const msg = rows[0];

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io) {
      if (msgType === 'broadcast') {
        io.emit('chat:broadcast', msg);           // ← This was missing or broken
      } else if (msgType === 'private') {
        io.to(`user:${recipient_id}`).emit('chat:private', msg);
        io.to(`user:${req.user.id}`).emit('chat:private', msg);
      } else if (msgType === 'multicast') {
        io.to(`room:${room_id}`).emit('chat:multicast', msg);
      }
    }

    return res.status(201).json({ success: true, message: msg });

  } catch (err) {
    console.error('SendMessage error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── GET BROADCAST MESSAGES ─────────────────────────
const getBroadcasts = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const before = req.query.before; // for pagination

    let query = `SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
                 FROM chat_messages m
                 JOIN users u ON m.sender_id = u.id
                 WHERE m.type = 'broadcast'`;
    const params = [];

    if (before) {
      query += ' AND m.id < ?';
      params.push(before);
    }
    query += ' ORDER BY m.created_at DESC LIMIT ?';
    params.push(limit);

    const [rows] = await db.execute(query, params);
    return res.status(200).json({ success: true, messages: rows.reverse() });
  } catch (err) {
    console.error('GetBroadcasts error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── GET PRIVATE CONVERSATION ──────────────────────
const getPrivateMessages = async (req, res) => {
  try {
    const otherId = req.params.userId;
    const myId    = req.user.id;

    const [rows] = await db.execute(
      `SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
       FROM chat_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.type = 'private'
         AND ((m.sender_id = ? AND m.recipient_id = ?)
           OR (m.sender_id = ? AND m.recipient_id = ?))
       ORDER BY m.created_at ASC LIMIT 100`,
      [myId, otherId, otherId, myId]
    );

    // Mark as read
    await db.execute(
      `UPDATE chat_messages SET is_read = TRUE
       WHERE type = 'private' AND sender_id = ? AND recipient_id = ? AND is_read = FALSE`,
      [otherId, myId]
    );

    return res.status(200).json({ success: true, messages: rows });
  } catch (err) {
    console.error('GetPrivateMessages error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── GET UNREAD COUNTS ──────────────────────────────
const getUnreadCounts = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT sender_id, COUNT(*) AS count
       FROM chat_messages
       WHERE recipient_id = ? AND type = 'private' AND is_read = FALSE
       GROUP BY sender_id`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, unread: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

// ── CHAT ROOMS (MULTICAST) ────────────────────────

const createRoom = async (req, res) => {
  try {
    const { name, member_ids } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Room name required.' });

    const [result] = await db.execute(
      'INSERT INTO chat_rooms (name, created_by) VALUES (?, ?)',
      [name.trim(), req.user.id]
    );
    const roomId = result.insertId;

    // Add creator + invited members
    const members = [...new Set([req.user.id, ...(member_ids || [])])];
    for (const uid of members) {
      await db.execute(
        'INSERT IGNORE INTO chat_room_members (room_id, user_id) VALUES (?, ?)',
        [roomId, uid]
      );
    }

    return res.status(201).json({ success: true, room_id: roomId, name });
  } catch (err) {
    console.error('CreateRoom error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getRooms = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT r.*, COUNT(m.user_id) AS member_count
       FROM chat_rooms r
       JOIN chat_room_members m ON r.id = m.room_id
       WHERE m.user_id = ?
       GROUP BY r.id
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );
    return res.status(200).json({ success: true, rooms: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

const getRoomMessages = async (req, res) => {
  try {
    const roomId = req.params.roomId;
    // Verify membership
    const [mem] = await db.execute(
      'SELECT 1 FROM chat_room_members WHERE room_id = ? AND user_id = ?',
      [roomId, req.user.id]
    );
    if (!mem.length) return res.status(403).json({ success: false, message: 'Not a member.' });

    const [rows] = await db.execute(
      `SELECT m.*, u.name AS sender_name, u.avatar AS sender_avatar
       FROM chat_messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.room_id = ? AND m.type = 'multicast'
       ORDER BY m.created_at ASC LIMIT 100`,
      [roomId]
    );
    return res.status(200).json({ success: true, messages: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  getUsers, sendMessage,
  getBroadcasts, getPrivateMessages, getUnreadCounts,
  createRoom, getRooms, getRoomMessages
};
