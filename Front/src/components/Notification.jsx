import { useState, useEffect, useRef } from 'react';
import { Bell, Check, X, ChevronRight, RefreshCw } from 'lucide-react';
import "./NotificationComponent.css";

// Composant pour afficher les erreurs globales
const ErrorDisplay = ({ error, onDismiss }) => {
  if (!error) return null;
  
  return (
    <div className="error-display">
      <div className="error-message">{error}</div>
      <button 
        onClick={onDismiss}
        className="error-dismiss-btn"
      >
        <X className="error-icon" />
      </button>
    </div>
  );
};

// Composant ProfileAvatar pour gérer le chargement et les erreurs d'images
const ProfileAvatar = ({ notification }) => {
  const [imageError, setImageError] = useState(false);
  const imgRef = useRef(null);
  
  const getProfileInitial = () => {
    if (!notification || !notification.sender) return '?';
    
    if (notification.sender.firstName && notification.sender.firstName.length > 0) {
      return notification.sender.firstName.charAt(0).toUpperCase();
    }
    
    if (notification.sender.email && notification.sender.email.length > 0) {
      return notification.sender.email.charAt(0).toUpperCase();
    }
    
    return '?';
  };

  const hasValidProfilePhoto = notification?.sender?.profilePhoto && 
                               typeof notification.sender.profilePhoto === 'string' &&
                               notification.sender.profilePhoto.trim() !== '';

  // Construire l'URL complète pour l'image de profil
  const getProfilePhotoUrl = () => {
    if (!hasValidProfilePhoto) return null;
    
    // Si l'URL est déjà complète (commence par http ou https)
    if (notification.sender.profilePhoto.startsWith('http')) {
      return notification.sender.profilePhoto;
    }
    
    // Sinon, construire l'URL complète
    return `https://runova.onrender.com/uploads/profiles/${notification.sender.profilePhoto}`;
  };

  useEffect(() => {
    // Réinitialiser l'état d'erreur si la source de l'image change
    setImageError(false);
  }, [notification?.sender?.profilePhoto]);


  return (
    <div className="avatar-container">
      {hasValidProfilePhoto && !imageError && (
        <img 
          ref={imgRef}
          src={getProfilePhotoUrl()} 
          alt="Profile" 
          className="profile-photo"
          onError={() => setImageError(true)}
          style={{ width: '110%', height: '110%', objectFit: 'cover' }}
        />
      )}
      
      {(!hasValidProfilePhoto || imageError) && (
        <div className="profile-placeholder">
          {getProfileInitial()}
        </div>
      )}
    </div>
  );
};

export default function NotificationsComponent() {
  const containerRef = useRef(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [processingIds, setProcessingIds] = useState([]);
  
  // URL de base du serveur backend
  const API_BASE_URL = 'https://runova.onrender.com'; 

useEffect(() => {
  const handleClickOutside = (event) => {
    if (containerRef.current && !containerRef.current.contains(event.target)) {
      setShowNotifications(false);
    }
  };

  document.addEventListener('mousedown', handleClickOutside);
  return () => {
    document.removeEventListener('mousedown', handleClickOutside);
  };
}, []);

  

  // Fonction pour récupérer les notifications
  const fetchNotifications = async () => {
    setLoading(true);
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      setError('Problème d\'authentification: Aucun token trouvé');
      setLoading(false);
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications?limit=10`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include' // Pour inclure les cookies si nécessaire
      });
      
      if (response.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setLoading(false);
        return;
      }
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`Échec lors de la récupération des notifications (${response.status})`);
      }
      
      const data = await response.json();
      console.log('Données reçues:', data); // Pour le débogage
      setNotifications(data.data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Marquer une notification comme lue
  const markAsRead = async (id) => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      setError('Problème d\'authentification: Aucun token trouvé');
      return;
    }
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Échec lors du marquage comme lu (${response.status})`);
      }
      
      // Mettre à jour le statut de lecture dans l'état local
      setNotifications(prevNotifications => 
        prevNotifications.map(notif => 
          notif._id === id ? { ...notif, isRead: true } : notif
        )
      );
      
      // Mettre à jour le compteur de non lus
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Erreur lors du marquage comme lu:', err);
      setError(err.message);
    }
  };

  // Marquer toutes les notifications comme lues
  const markAllAsRead = async () => {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

    if (!token) {
      setError('Problème d\'authentification: Aucun token trouvé');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (response.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        return;
      }
      
      if (!response.ok) {
        throw new Error(`Échec lors du marquage de toutes les notifications (${response.status})`);
      }
      
      // Mettre à jour l'état local
      setNotifications(prevNotifications => 
        prevNotifications.map(notif => ({ ...notif, isRead: true }))
      );
      
      setUnreadCount(0);
    } catch (err) {
      console.error('Erreur lors du marquage de toutes les notifications:', err);
      setError(err.message);
    }
  };

  // Répondre à une demande de partage de clé
  const respondToKeyShareRequest = async (notificationId, accept) => {
    setProcessingIds(prev => [...prev, notificationId]);

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`${API_BASE_URL}/api/contacts/key-share-response`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          notificationId,
          accept
        }),
        credentials: 'include'
      });
      
      if (response.status === 401) {
        // Problème d'authentification
        console.log('Token expiré ou invalide');
        setError('Session expirée. Veuillez vous reconnecter.');
        return;
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Erreur réseau' }));
        throw new Error(errorData.message || `Échec de la réponse (${response.status})`);
      }

      // Mettre à jour la notification dans la liste
      setNotifications(prev => 
        prev.map(notif => 
          notif._id === notificationId 
            ? { 
                ...notif, 
                isRead: true, 
                responseDate: new Date().toISOString(),
                status: accept ? 'accepted' : 'rejected'
              } 
            : notif
        )
      );
      
      // Diminuer le compteur de notifications non lues si nécessaire
      const currentNotification = notifications.find(n => n._id === notificationId);
      if (currentNotification && !currentNotification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
      
      // Rafraîchir les notifications pour avoir les plus récentes
      setTimeout(fetchNotifications, 500); // Attendre un peu pour que le serveur traite la requête
      
    } catch (err) {
      console.error('Erreur lors de la réponse:', err);
      setError(`Échec de la réponse: ${err.message}`);
    } finally {
      setProcessingIds(prev => prev.filter(id => id !== notificationId));
    }
  };

  // Charger les notifications au montage du composant
  useEffect(() => {
    fetchNotifications();
    
    // Rafraîchir les notifications toutes les 60 secondes
    const interval = setInterval(fetchNotifications, 60000);
    
    return () => clearInterval(interval);
  }, []);

  // Formatter la date
  const formatDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { 
        day: 'numeric', 
        month: 'short', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      console.error('Erreur de formatage de date:', e);
      return dateString; // Renvoyer la chaîne d'origine en cas d'erreur
    }
  };

  // Afficher une notification
  const renderNotification = (notification) => {
    if (!notification) return null;
    
    const isProcessing = processingIds.includes(notification._id);
    
    return (
      <div 
        key={notification._id}
        className={`notification-item ${!notification.isRead ? 'notification-unread' : ''}`}
        onClick={() => !notification.isRead && markAsRead(notification._id)}
      >
        <div className="notification-content">
          {/* Utilisation du composant ProfileAvatar */}
          <ProfileAvatar notification={notification} />
          
          <div className="notification-text">
            <p className="notification-message">
              {notification.message || 'Nouvelle notification'}
            </p>
            <p className="notification-date">
              {formatDate(notification.createdAt)}
            </p>
          </div>
        </div>
        
        {/* Actions pour les demandes de partage de clé */}
        {notification.type === 'key_share_request' && !notification.responseDate && !notification.status && (
          <div className="notification-actions">
            <button
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation(); // Empêcher le déclenchement du onClick du parent
                respondToKeyShareRequest(notification._id, false);
              }}
              className="btn-reject"
            >
              {isProcessing ? <RefreshCw className="btn-icon spinning" /> : <X className="btn-icon" />}
              Refuser
            </button>
            <button
              disabled={isProcessing}
              onClick={(e) => {
                e.stopPropagation(); // Empêcher le déclenchement du onClick du parent
                respondToKeyShareRequest(notification._id, true);
              }}
              className="btn-accept"
            >
              {isProcessing ? <RefreshCw className="btn-icon spinning" /> : <Check className="btn-icon" />}
              Accepter
            </button>
          </div>
        )}
        
        {/* Afficher le statut de réponse si déjà répondu */}
        {notification.type === 'key_share_request' && (notification.responseDate || notification.status) && (
          <div className="notification-status">
            {notification.status === 'accepted' ? (
              <span className="status-accepted">
                <Check className="status-icon" /> Demande acceptée
              </span>
            ) : notification.status === 'rejected' ? (
              <span className="status-rejected">
                <X className="status-icon" /> Demande refusée
              </span>
            ) : null}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <ErrorDisplay error={error} onDismiss={() => setError(null)} />
      
      <div className="notification-container" ref={containerRef}>
        {/* Bouton de notification avec badge */}
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className="notification-button"
        >
          <Bell className="bell-icon" />
          {unreadCount > 0 && (
            <span className="notification-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
        
        {/* Panneau de notifications */}
        {showNotifications && (
          <div className="notifications-panel">
            <div className="panel-header">
              <h3 className="panel-title">Notifications</h3>
              {unreadCount > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="mark-all-read"
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>
            
            <div className="notifications-list">
              {loading && (
                <div className="loading-container">
                  <RefreshCw className="loading-icon spinning" />
                  <span>Chargement...</span>
                </div>
              )}
              
              {error && (
                <div className="error-container">
                  <p>{error}</p>
                  <button 
                    onClick={() => {
                      setError(null);
                      fetchNotifications();
                    }}
                    className="retry-button"
                  >
                    <RefreshCw className="retry-icon" />
                    Réessayer
                  </button>
                </div>
              )}
              
              {!loading && !error && notifications.length === 0 && (
                <div className="empty-container">
                  Aucune notification
                </div>
              )}
              
              {notifications.map(renderNotification)}
            </div>
            
            <div className="panel-footer">
              <button 
                onClick={fetchNotifications} 
                className="refresh-button"
              >
                <RefreshCw className="refresh-icon" />
                Actualiser
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}