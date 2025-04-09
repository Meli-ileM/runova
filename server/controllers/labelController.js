const Label = require('../models/Label');
const { handleError } = require('./usercontroller');
const mongoose = require('mongoose');

/**
 * @desc    Ajouter un nouveau label
 * @route   POST /api/labels
 * @access  Privé
 */
const User = require('../models/User'); // assure-toi d'importer ton modèle User

exports.addLabel = async (req, res) => {
  try {
    const { name, color, type, associatedEmails } = req.body;
    const userId = req.user.id;

    if (!name || !color || !type) {
      return res.status(400).json({
        status: 'error',
        message: 'Le nom, la couleur et le type sont obligatoires'
      });
    }

    if (!['email', 'contact'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Type de label invalide. Le type doit être "email" ou "contact".'
      });
    }

    const labelData = { name, color, type, userId };

    if (type === 'email') {
      if (!Array.isArray(associatedEmails)) {
        return res.status(400).json({
          status: 'error',
          message: 'associatedEmails doit être un tableau'
        });
      }

      // Vérifier si chaque email existe dans la BDD
      const users = await User.find({ email: { $in: associatedEmails } }).select('email');
      const existingEmails = users.map(u => u.email);

      const invalidEmails = associatedEmails.filter(email => !existingEmails.includes(email));

      if (invalidEmails.length > 0) {
        return res.status(400).json({
          status: 'error',
          message: 'Certains emails sont invalides :',
          invalidEmails
        });
      }

      labelData.associatedEmails = existingEmails;
    }

    const newLabel = await Label.create(labelData);

    res.status(201).json({
      status: 'success',
      message: 'Label ajouté avec succès',
      data: { label: newLabel }
    });

  } catch (error) {
    handleError(error, res);
  }
};


/**
 * @desc    Récupérer tous les labels d'un utilisateur
 * @route   GET /api/labels
 * @access  Privé
 */
exports.getLabels = async (req, res) => {
  try {
    const userId = req.user.id;
    const { type } = req.query;

    let query = { userId };

    if (type) {
      if (!['email', 'contact'].includes(type)) {
        return res.status(400).json({
          status: 'error',
          message: 'Type de label invalide. Le type doit être "email" ou "contact".'
        });
      }
      query.type = type;
    }

    const labels = await Label.find(query).select('name color type associatedEmails');

    res.status(200).json({
      status: 'success',
      results: labels.length,
      data: {
        labels
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Récupérer un label spécifique
 * @route   GET /api/labels/:id
 * @access  Privé
 */
exports.getLabel = async (req, res) => {
  try {
    const userId = req.user.id;
    const labelId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(labelId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de label invalide'
      });
    }

    const label = await Label.findOne({ _id: labelId, userId }).select('name color type associatedEmails');

    if (!label) {
      return res.status(404).json({
        status: 'error',
        message: 'Label non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      data: {
        label
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Mettre à jour un label
 * @route   PUT /api/labels/:id
 * @access  Privé
 */
exports.updateLabel = async (req, res) => {
  try {
    const userId = req.user.id;
    const labelId = req.params.id;
    const { name, color, type, associatedEmails } = req.body;

    if (!mongoose.Types.ObjectId.isValid(labelId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de label invalide'
      });
    }

    if (type && !['email', 'contact'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: 'Type de label invalide. Le type doit être "email" ou "contact".'
      });
    }

    const label = await Label.findOne({ _id: labelId, userId });

    if (!label) {
      return res.status(404).json({
        status: 'error',
        message: 'Label non trouvé'
      });
    }

    label.name = name ?? label.name;
    label.color = color ?? label.color;
    label.type = type ?? label.type;

    if (label.type === 'email' && associatedEmails) {
      label.associatedEmails = Array.isArray(associatedEmails) ? associatedEmails : label.associatedEmails;
    }

    const updatedLabel = await label.save();

    res.status(200).json({
      status: 'success',
      message: 'Label mis à jour avec succès',
      data: {
        label: updatedLabel
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Supprimer un label
 * @route   DELETE /api/labels/:id
 * @access  Privé
 */
exports.deleteLabel = async (req, res) => {
  try {
    const userId = req.user.id;
    const labelId = req.params.id;

    if (!mongoose.Types.ObjectId.isValid(labelId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de label invalide'
      });
    }

    const deletedLabel = await Label.findOneAndDelete({ _id: labelId, userId });

    if (!deletedLabel) {
      return res.status(404).json({
        status: 'error',
        message: 'Label non trouvé'
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Label supprimé avec succès'
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Récupérer les emails associés à un label
 * @route   GET /api/labels/:id/emails
 * @access  Privé
 */
exports.getLabelEmails = async (req, res) => {
  try {
    const userId = req.user.id;
    const labelId = req.params.id;


    if (!mongoose.Types.ObjectId.isValid(labelId)) {
      return res.status(400).json({
        status: 'error',
        message: 'ID de label invalide'
      });
    }


    const label = await Label.findOne({ _id: labelId, userId });
    if (!label) {
      return res.status(404).json({
        status: 'error',
        message: 'Label non trouvé'
      });
    }


    let query = {};
    if (label.type === 'email') {
      query = { 'sender.email': { $in: label.associatedEmails } };
    } else if (label.type === 'contact') {
      query = {
        $or: [
          { 'recipients.to.email': { $in: label.associatedEmails } },
          { 'recipients.cc.email': { $in: label.associatedEmails } },
          { 'recipients.bcc.email': { $in: label.associatedEmails } }
        ]
      };
    }


    const emails = await Email.find(query)
      .sort({ createdAt: -1 })
      .populate('labels', 'name color');


    res.status(200).json({
      status: 'success',
      results: emails.length,
      data: {
        emails
      }
    });


  } catch (error) {
    handleError(error, res);
  }
};

