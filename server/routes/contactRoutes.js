const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contactController');
const { protect } = require('../middleware/authMiddleware');

// Routes pour la gestion des contacts
router.route('/')
  .post(protect, contactController.addContact)       // Ajouter un nouveau contact
  .get(protect, contactController.getContacts);     // Récupérer tous les contacts

router.route('/search')
  .get(protect, contactController.searchContacts);  // Rechercher des contacts

router.route('/:id')
  .get(protect, contactController.getContact)       // Récupérer un contact spécifique
  .put(protect, contactController.updateContact)    // Mettre à jour un contact
  .delete(protect, contactController.deleteContact); // Supprimer un contact


  router.post('/key-share-response',protect,  contactController.respondToKeyShareRequest);
  router.post('/:id/request-key-share',protect,  contactController.requestKeyShare);

  
router.route('/:id/labels')
  .patch(protect, contactController.updateContactLabels); // Gérer les labels d'un contact

module.exports = router;