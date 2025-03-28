const express = require('express');
const router = express.Router();
const keyController = require('../controllers/keyController');
const authMiddleware = require('../middleware/authMiddleware');

// Toutes les routes de clés nécessitent une authentification
router.use(authMiddleware.protect);

// Route pour stocker les clés de l'utilisateur
router.post('/store', keyController.storeUserKeys);

// Route pour vérifier si l'utilisateur a généré ses clés
router.get('/verify', keyController.verifyKeysGenerated);

// Route pour récupérer la clé publique d'un utilisateur
router.get('/:userId', keyController.getUserPublicKey);

// Route pour récupérer les clés publiques de plusieurs utilisateurs
router.post('/batch', keyController.getUsersPublicKeys);

module.exports = router;