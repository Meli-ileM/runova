const Notification = require('../models/Notification');
const User = require('../models/User');
const { handleError } = require('./usercontroller');

/**
 * @desc    Récupérer toutes les notifications d'un utilisateur
 * @route   GET /api/notifications
 * @access  Privé
 */
exports.getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Options de pagination
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;
    
    // Filtre pour les notifications non lues si demandé
    const filter = { recipient: userId };
    if (req.query.unread === 'true') {
      filter.isRead = false;
    }

    // Récupérer les notifications avec pagination
    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'sender',
        select: 'firstName lastName email profilePhoto'
      });
    
    // Compter le nombre total de notifications non lues
    const unreadCount = await Notification.countDocuments({ 
      recipient: userId,
      isRead: false
    });

    res.status(200).json({
      status: 'success',
      results: notifications.length,
      unreadCount,
      data: {
        notifications
      }
    });

  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Marquer une notification comme lue
 * @route   PATCH /api/notifications/:id/read
 * @access  Privé
 */
exports.markNotificationAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    // Mettre à jour la notification
    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, recipient: userId },
      { isRead: true },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification non trouvée ou non autorisée'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Notification marquée comme lue',
      data: {
        notification
      }
    });
    
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Marquer toutes les notifications comme lues
 * @route   PATCH /api/notifications/read-all
 * @access  Privé
 */
exports.markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Mettre à jour toutes les notifications non lues
    const result = await Notification.updateMany(
      { recipient: userId, isRead: false },
      { isRead: true }
    );
    
    res.status(200).json({
      status: 'success',
      message: 'Toutes les notifications ont été marquées comme lues',
      data: {
        modifiedCount: result.nModified || result.modifiedCount
      }
    });
    
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Supprimer une notification
 * @route   DELETE /api/notifications/:id
 * @access  Privé
 */
exports.deleteNotification = async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;
    
    // Supprimer la notification
    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      recipient: userId
    });
    
    if (!notification) {
      return res.status(404).json({
        status: 'error',
        message: 'Notification non trouvée ou non autorisée'
      });
    }
    
    res.status(200).json({
      status: 'success',
      message: 'Notification supprimée avec succès'
    });
    
  } catch (error) {
    handleError(error, res);
  }
};

/**
 * @desc    Obtenir le nombre de notifications non lues
 * @route   GET /api/notifications/unread-count
 * @access  Privé
 */
exports.getUnreadCount = async (req, res) => {
  try {
    const userId = req.user.id;
    
    const unreadCount = await Notification.countDocuments({
      recipient: userId,
      isRead: false
    });
    
    res.status(200).json({
      status: 'success',
      data: {
        unreadCount
      }
    });
    
  } catch (error) {
    handleError(error, res);
  }
};