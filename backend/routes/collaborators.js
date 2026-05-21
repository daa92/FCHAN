const express = require('express');
const router  = express.Router();
const {
  invite, getCollaborators,
  acceptInvite, declineInvite,
  removeCollaborator, getMyInvitations
} = require('../controllers/collaboratorController');
const { auth } = require('../middleware/auth');

router.use(auth);

router.post('/invite', invite);
router.get('/farm/:farmId', getCollaborators);
router.get('/my-invitations', getMyInvitations);
router.get('/accept', acceptInvite);
router.get('/decline', declineInvite);
router.delete('/:id', removeCollaborator);

module.exports = router;
