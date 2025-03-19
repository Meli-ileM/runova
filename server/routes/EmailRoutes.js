const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailcontroller');

const { validateEmail } = require('../middleware/emailMiddleware');
const { protect } = require('../middleware/authMiddleware');


router.use(protect); 

// Routes pour les emails
router.post('/', emailController.createEmail);
router.get('/', emailController.getEmails);
router.get('/:id', emailController.getEmailById);
router.put('/:id', emailController.updateEmail);
router.delete('/:id', emailController.moveToTrash);


// Routes spécifiques
router.patch('/:id/restore', emailController.restoreFromTrash);
router.delete('/:id/permanent', emailController.permanentDelete);
router.patch('/:id/archive', emailController.archiveEmail);
router.patch('/:id/unarchive', emailController.unarchiveEmail);
router.patch('/:id/flag-important', emailController.markAsImportant);
router.patch('/:id/unflag-important', emailController.unmarkAsImportant);
router.get('/thread/:threadId', emailController.getThreadEmails);

// // Routes pour les pièces jointes
router.post('/:id/attachments', emailController.addAttachment);
router.delete('/:id/attachments/:attachmentId', emailController.removeAttachment);


router.patch('/:id/labels/:labelId', emailController.toggleLabel);

// Routes pour les threads
// router.get('/thread/:threadId', threadController.getThreadEmails);
// router.get('/threads', threadController.getThreads);
// router.patch('/threads/:id/read', threadController.markThreadAsRead);
// router.patch('/threads/:id/unread', threadController.markThreadAsUnread);
// router.patch('/threads/:id/important', threadController.markThreadAsImportant);
// router.patch('/threads/:id/unimportant', threadController.unmarkThreadAsImportant);
// router.patch('/threads/:id/archive', threadController.archiveThread);
// router.patch('/threads/:id/unarchive', threadController.unarchiveThread);
// router.patch('/threads/:id/trash', threadController.moveThreadToTrash);
// router.patch('/threads/:id/restore', threadController.restoreThreadFromTrash);
// router.delete('/threads/:id', threadController.permanentDeleteThread);
// router.delete('/threads/:threadId/emails/:emailId', threadController.deleteEmailFromThread);

// // Routes pour les labels
// router.patch('/:id/labels/:labelId', emailController.toggleLabel);;
module.exports = router;