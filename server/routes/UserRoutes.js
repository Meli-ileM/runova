const express = require('express');
const router = express.Router();
const userController = require('../controllers/usercontroller');
const authMiddleware = require('../middleware/authMiddleware');
const { setupDecryptionKey } = require('../middleware/authMiddleware');

const multer = require('multer');

// Configuration de multer pour la gestion des fichiers
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (req, file, cb) => {
    // Accepter uniquement les images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers image sont autorisés'), false);
    }
  }
});

// Routes publiques (sans authentification)
router.post('/register', upload.single('profile_photo'), userController.register);
router.post('/login', userController.login, setupDecryptionKey);
router.post('/verify-2fa', userController.verify2FA);
router.post('/setup-2fa-login', userController.setup2FA);
router.post('/verify-2fa-reset', userController.verify2FAForReset);
router.post('/reset-password', userController.resetPasswordVia2FA);

router.get('/check-private-key', userController.checkPrivateKey);

// Route pour récupérer la clé privée chiffrée (pour rechiffrement)
router.get('/get-private-key', userController.getPrivateKey);

// Route pour vérifier le code 2FA lors de la réinitialisation
router.post('/verify-2fa-reset', userController.verify2FAForReset);

// Route pour réinitialiser le mot de passe via 2FA
router.post('/reset-password', userController.resetPasswordVia2FA);
// Routes protégées (avec authentification)
router.use(authMiddleware.protect); // Applique le middleware d'authentification sur toutes les routes suivantes


router.get('/profile', userController.getProfile);
router.patch('/editprofile', upload.single('profile_photo'), userController.updateProfile);
router.patch('/password', userController.updatePassword);
router.delete('/delete-account', userController.deleteAccount);

router.get('/:userId', userController.getUserById);

router.get('/profile/search', userController.searchUsers);

router.use(authMiddleware.protect); // Applique le middleware d'authentification sur toutes les routes suivantes

// Routes pour la gestion du 2FA
router.post('/setup-2fa', userController.setup2FA);
router.post('/enable-2fa', userController.enable2FA);
router.post('/disable-2fa', userController.disable2FA);
module.exports = router;