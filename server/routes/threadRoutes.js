// ThreadRoutes.js

const express = require('express');
const router = express.Router();
const threadController = require('../controllers/ThreadController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Routes pour les threads
router.get('/', threadController.getThreads);
router.patch('/:id/read', threadController.markThreadAsRead);
router.patch('/:id/unread', threadController.markThreadAsUnread);
router.patch('/:id/important', threadController.markThreadAsImportant);
router.patch('/:id/unimportant', threadController.unmarkThreadAsImportant);
router.patch('/:id/archive', threadController.archiveThread);
router.patch('/:id/unarchive', threadController.unarchiveThread);
router.patch('/:id/trash', threadController.moveThreadToTrash);
router.patch('/:id/restore', threadController.restoreThreadFromTrash);
router.delete('/:id', threadController.permanentDeleteThread);
router.delete('/:threadId/emails/:emailId', threadController.deleteEmailFromThread);

module.exports = router;
