const express = require('express');
const authMiddleware = require('../middleware/authMiddleware'); // Importez le middleware
const roomsController = require('../controllers/rooms-controller');

const router = express.Router();

router.post('/create', authMiddleware.protect, roomsController.createRoom);
router.post('/join', authMiddleware.protect, roomsController.joinRoom);
router.post('/notify', authMiddleware.protect, roomsController.notifyParticipants);
router.get('/join/:roomID', roomsController.getRoomJoinPage);
router.post('/join/:roomID', authMiddleware.protect, roomsController.joinRoomByLink);
router.post('/leave/:roomID', authMiddleware.protect, roomsController.leaveRoom);
router.get('/:roomID', roomsController.getRoomInfo);

module.exports = router;