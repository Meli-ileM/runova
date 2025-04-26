const express = require('express');
const router = express.Router();
const labelController = require('../controllers/labelController');
const { protect } = require('../middleware/authMiddleware'); // Assure que l'utilisateur est authentifié

// Ajouter un label
router.post('/', protect, labelController.addLabel);

// Récupérer tous les labels (option : ?type=email ou ?type=contact)
router.get('/', protect, labelController.getLabels);

// Récupérer un label spécifique
router.get('/:id', protect, labelController.getLabel);

// Mettre à jour un label
router.put('/:id', protect, labelController.updateLabel);

// Supprimer un label
router.delete('/:id', protect, labelController.deleteLabel);

router.get('/labels/:id/emails', labelController.getLabelEmails);


module.exports = router;
