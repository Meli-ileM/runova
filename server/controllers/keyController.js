const User = require('../models/User');

exports.storeUserKeys = async (req, res) => {
  try {
    const { publicKey, encryptedPrivateKey } = req.body;
    
    if (!publicKey || !encryptedPrivateKey) {
      return res.status(400).json({
        status: 'error',
        message: 'Les clés publique et privée chiffrée sont requises'
      });
    }
    
    // Stocker les clés de l'utilisateur
    await User.findByIdAndUpdate(req.user.id, {
      publicKey,
      encryptedPrivateKey,
      keysGenerated: true
    });
    
    res.status(200).json({
      status: 'success',
      message: 'Clés stockées avec succès'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getUserPublicKey = async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('publicKey email');
    
    if (!user || !user.publicKey) {
      return res.status(404).json({
        status: 'error',
        message: 'Clé publique non trouvée'
      });
    }
    
    res.status(200).json({
      status: 'success',
      data: {
        email: user.email,
        publicKey: user.publicKey
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.getUsersPublicKeys = async (req, res) => {
  try {
    const { userIds } = req.body;
    
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Liste d\'identifiants utilisateurs requise'
      });
    }
    
    const users = await User.find({
      _id: { $in: userIds }
    }).select('_id email publicKey');
    
    // Mapper les résultats en un objet pour un accès facile
    const publicKeys = {};
    users.forEach(user => {
      if (user.publicKey) {
        publicKeys[user._id.toString()] = {
          email: user.email,
          publicKey: user.publicKey
        };
      }
    });
    
    res.status(200).json({
      status: 'success',
      data: publicKeys
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

exports.verifyKeysGenerated = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('keysGenerated');
    
    res.status(200).json({
      status: 'success',
      data: {
        keysGenerated: user.keysGenerated || false
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};