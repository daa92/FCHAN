const crypto       = require('crypto');
const Collaborator = require('../models/Collaborator');
const Farm         = require('../models/Farm');
const User         = require('../models/User');
const { sendEmail, getAppUrl } = require('../services/email');

// POST /api/collaborators/invite
const invite = async (req, res) => {
  try {
    const { farm_id, email, role } = req.body;

    if (!farm_id || !email) {
      return res.status(400).json({
        success: false,
        message: 'Farm and email are required.'
      });
    }

    // Verify farm belongs to user
    const farm = await Farm.findById(farm_id);
    if (!farm || farm.user_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Farm not found or access denied.'
      });
    }

    // Check if already invited
    const [existing] = await require('../config/db').execute(
      `SELECT * FROM collaborators
       WHERE farm_id = ? AND invited_email = ?
       AND status = 'pending'`,
      [farm_id, email]
    );
    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        message: 'This email has already been invited.'
      });
    }

    // Generate token
    const token   = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await Collaborator.create({
      farm_id,
      invited_by: req.user.id,
      invited_email: email,
      role: role || 'viewer',
      token,
      token_expires: expires
    });

    // Send invitation email
    await sendEmail(email, 'collaboratorInvite',
      req.user.name, farm.name, token, getAppUrl(req)
    );

    return res.status(201).json({
      success: true,
      message: `Invitation sent to ${email}`
    });

  } catch (err) {
    console.error('Invite error:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Internal server error.'
    });
  }
};

// GET /api/collaborators/farm/:farmId
const getCollaborators = async (req, res) => {
  try {
    const farm = await Farm.findById(req.params.farmId);
    if (!farm || farm.user_id !== req.user.id) {
      return res.status(403).json({
        success: false, message: 'Access denied.'
      });
    }
    const collaborators = await Collaborator.findByFarm(req.params.farmId);
    return res.status(200).json({ success: true, collaborators });
  } catch (err) {
    return res.status(500).json({
      success: false, message: 'Internal server error.'
    });
  }
};

// GET /api/collaborators/accept?token=xxx
const acceptInvite = async (req, res) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({
        success: false, message: 'Token required.'
      });
    }

    const invite = await Collaborator.findByToken(token);
    if (!invite) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired invitation.'
      });
    }

    await Collaborator.accept(token, req.user.id);

    return res.status(200).json({
      success: true,
      message: `You now have access to ${invite.farm_name}!`,
      farm_id: invite.farm_id
    });

  } catch (err) {
    return res.status(500).json({
      success: false, message: 'Internal server error.'
    });
  }
};

// GET /api/collaborators/decline?token=xxx
const declineInvite = async (req, res) => {
  try {
    const { token } = req.query;
    await Collaborator.decline(token);
    return res.status(200).json({
      success: true, message: 'Invitation declined.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false, message: 'Internal server error.'
    });
  }
};

// DELETE /api/collaborators/:id
const removeCollaborator = async (req, res) => {
  try {
    await Collaborator.remove(req.params.id);
    return res.status(200).json({
      success: true, message: 'Collaborator removed.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false, message: 'Internal server error.'
    });
  }
};

// GET /api/collaborators/my-invitations
// Returns all pending invitations sent to the logged-in user's email
const getMyInvitations = async (req, res) => {
  try {
    const [rows] = await require('../config/db').execute(
      `SELECT c.id, c.token, c.role, c.status, c.created_at,
              f.id AS farm_id, f.name AS farm_name,
              f.city, f.country,
              u.name AS invited_by_name
       FROM collaborators c
       JOIN farms f ON c.farm_id = f.id
       JOIN users u ON c.invited_by = u.id
       WHERE c.invited_email = ?
         AND c.status = 'pending'
         AND c.token_expires > NOW()
       ORDER BY c.created_at DESC`,
      [req.user.email]
    );
    return res.status(200).json({ success: true, invitations: rows });
  } catch (err) {
    console.error('GetMyInvitations error:', err.message);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = {
  invite, getCollaborators,
  acceptInvite, declineInvite,
  removeCollaborator, getMyInvitations
};
