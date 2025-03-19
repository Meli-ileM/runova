import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../../assets/logo.png';
import Notifications from '../../components/Notification';
import './index.css';
import { MailIcon, StarIcon, ArchiveIcon, Trash2Icon, CornerUpLeftIcon, XCircleIcon, DownloadIcon, PaperclipIcon } from 'lucide-react';
import { 
  Star, Archive, Trash2, CornerUpLeft, XCircle, Paperclip, Download, ArrowLeft,Reply,ReplyAll,Forward,MoreHorizontal,Calendar,User,
  Info
} from 'lucide-react';
import DraftModal from './draftmodal'; // Ajustez le chemin selon votre structure

const API_BASE_URL = 'https://runova.onrender.com/api';

const EmailApp = () => {
  // États pour la gestion des emails et threads
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [threadEmails, setThreadEmails] = useState([]);
  const [replyContent, setReplyContent] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [currentFolder, setCurrentFolder] = useState('inbox');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalThreads, setTotalThreads] = useState(0);
  const [notification, setNotification] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
  const [emailList, setEmailList] = useState([]);
  const [emailInput, setEmailInput] = useState('');
  const [replyType, setReplyType] = useState('reply'); // 'reply', 'replyAll', 'forward'
  const [showCategories, setShowCategories] = useState(false);
  const [showCreateLabelModal, setShowCreateLabelModal] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#FF5733');
  const [newLabelType, setNewLabelType] = useState('email');
  const [labelType, setLabelType] = useState('email'); // 'email' ou 'contact'
  const [previewAttachment, setPreviewAttachment] = useState(null);
  const [contactSearch, setContactSearch] = useState('');
  const [showContactSuggestions, setShowContactSuggestions] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [userContacts, setUserContacts] = useState([]); // Vous devrez charger les contacts de l'utilisateur ici
  const [replyAttachments, setReplyAttachments] = useState([]);
   const [emailLabels, setEmailLabels] = useState([]); // Liste de tous les labels
    const [selectedLabelId, setSelectedLabelId] = useState(null); // Label sélectionné
  const navigate = useNavigate();
  const [selectedDraft, setSelectedDraft] = useState(null);
  const openDraft = (draft) => {
  setSelectedDraft(draft);
};

  const [newEmail, setNewEmail] = useState({
    subject: '',
    body: '',
    to: [],
    cc: [],
    bcc: [],
    attachments: [],
    isDraft: false
  });
 const [replyRecipients, setReplyRecipients] = useState({
    to: [],
    cc: [],
    bcc: []
  });
const loadLabels = async () => {
  const response = await fetchApi('/labels');
  if (response.success) {
    setLabels(response.data); // ou autre logique pour mettre à jour les labels
  }
};

  const [limit, setLimit] = useState(10);
  
const fetchApi = useCallback(async (url, options = {}) => {
  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

  if (!token) {
    showNotification('Authentification requise', 'error');
    navigate('/login');
    return { success: false, error: 'Token manquant' };
  }

  // Vérifier l'expiration du token
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    const currentTime = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < currentTime) {
      console.warn('Token expiré');
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      showNotification('Session expirée, veuillez vous reconnecter', 'error');
      navigate('/login');
      return { success: false, error: 'Token expiré' };
    }
  } catch (tokenError) {
    console.error('Erreur lors de la vérification du token:', tokenError);
    showNotification('Token invalide, veuillez vous reconnecter', 'error');
    navigate('/login');
    return { success: false, error: 'Token invalide' };
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };

  try {
    console.log(`Requête API: ${options.method || 'GET'} ${API_BASE_URL}${url}`);
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers
    });

    console.log(`Réponse API: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        showNotification('Session expirée, veuillez vous reconnecter', 'error');
        navigate('/login');
        return { success: false, error: 'Non autorisé' };
      }
      
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Erreur 403 - Détails:', errorData);
        return { 
          success: false, 
          error: errorData.message || errorData.error || 'Accès refusé',
          status: 403
        };
      }
      
      const errorData = await response.json().catch(() => ({}));
      console.error(`Erreur ${response.status}:`, errorData);
      
      return {
        success: false,
        error: errorData.message || errorData.error || `Erreur ${response.status}`,
        status: response.status
      };
    }

    const data = await response.json();
    return data;
    
  } catch (error) {
    console.error('Erreur réseau:', error);
    showNotification(
      error.message || 'Erreur lors de la communication avec le serveur', 
      'error'
    );
    return { 
      success: false,
      error: error.message 
    };
  }
}, [navigate]);

  const handleCreateLabel = async () => {
    if (!newLabelName.trim()) {
      showNotification('Le nom du label est requis', 'error');
      return;
    }

    // Vérification des adresses email si labelType = email
    if (labelType === 'email') {
      if (!Array.isArray(emailList) || emailList.length === 0) {
        showNotification("Ajoutez au moins une adresse e-mail pour ce label", 'error');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const invalidEmails = emailList.filter(email => !emailRegex.test(email));

      if (invalidEmails.length > 0) {
        showNotification(`Adresse(s) invalide(s) : ${invalidEmails.join(', ')}`, 'error');
        return;
      }
    }

    try {
      setIsLoading(true);

      const labelData = {
        name: newLabelName.trim(),
        color: newLabelColor,
        type: labelType,
        ...(labelType === 'email' && { associatedEmails: emailList }) // ✅ Clé corrigée ici
      };

      const response = await fetchApi('/labels', {
        method: 'POST',
        body: JSON.stringify(labelData)
      });

      if (response.success !== false) {
        showNotification('Label créé avec succès', 'success');
        setNewLabelName('');
        setNewLabelColor('#FF5733');
        setEmailList([]);
        setEmailInput('');
        setShowCreateLabelModal(false);
        await loadLabels(); // Si tu veux rafraîchir la liste après création
      }
    } catch (err) {
      console.error('Erreur lors de la création du label :', err);
      showNotification('Erreur lors de la création du label', 'error');
    } finally {
      setIsLoading(false);
    }
  };
  




const handlePreviewAttachment = (attachment) => {
  if (!attachment.data) {
    showNotification('Ce fichier est chiffré, impossible de le prévisualiser.', 'info');
    return;
  }

  const byteCharacters = atob(attachment.data);
  const byteNumbers = Array.from(byteCharacters, c => c.charCodeAt(0));
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: attachment.type });
  const url = URL.createObjectURL(blob);

  setPreviewAttachment({ ...attachment, blobUrl: url });
};






// Fonction pour sauvegarder un email comme brouillon
const saveDraft = async (emailData = null, showSuccessNotification = true) => {
  try {
    setIsLoading(true);
    
    // Utiliser les données passées en paramètre ou les données actuelles du formulaire
    const draftData = emailData || newEmail;
    
    // Validation minimale pour les brouillons (moins stricte que pour l'envoi)
    if (!draftData.subject.trim() && !draftData.body.trim() && draftData.to.length === 0) {
      if (showSuccessNotification) {
        showNotification('Rien à sauvegarder', 'warning');
      }
      return false;
    }

    // Fonction pour formater les destinataires
    const formatRecipients = recipients =>
      recipients.map(r => {
        if (!r) return null;
        const emailMatch = r.match(/<(.+)>/);
        const nameMatch = r.match(/(.+)</);
        const [email, name] = r.includes('<')
          ? [emailMatch ? emailMatch[1] : r, nameMatch ? nameMatch[1].trim() : '']
          : [r, ''];
        return { email, name };
      }).filter(Boolean);

    // Récupération du token d'authentification
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
     
    if (!token) {
      showNotification('Vous devez être connecté pour sauvegarder un brouillon', 'error');
      navigate('/login');
      return false;
    }

    try {
      const tokenParts = token.split('.');
      if (tokenParts.length < 2) {
        throw new Error("Format de token invalide");
      }
     
      // Décodage de la partie "payload" du token
      const payload = JSON.parse(atob(tokenParts[1]));
     
      // Extraction des informations utilisateur depuis le token
      const userData = {
        email: payload.email || payload.sub || 'user@example.com',
        userId: payload.id || payload.userId || payload.sub || 'user-id'
      };

      // Convertir les pièces jointes en Base64 si nécessaire
      const processedAttachments = await Promise.all(
        (draftData.attachments || []).map(async (attachment) => {
          if (attachment.file && !attachment.data) {
            const base64Data = await fileToBase64(attachment.file);
            return {
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              data: base64Data
            };
          }
          return attachment;
        })
      );

      const draftEmailData = {
        subject: draftData.subject || '',
        body: draftData.body || '',
        recipients: {
          to: formatRecipients(draftData.to || []),
          cc: formatRecipients(draftData.cc || []),
          bcc: formatRecipients(draftData.bcc || [])
        },
        attachments: processedAttachments,
        sender: {
          email: userData.email,
          userId: userData.userId
        },
        isDraft: true, // IMPORTANT: Marquer comme brouillon
        // Si c'est une mise à jour d'un brouillon existant
        ...(draftData.draftId && { draftId: draftData.draftId })
      };

      // Utiliser PUT si c'est une mise à jour, POST si c'est un nouveau brouillon
      const method = draftData.draftId ? 'PUT' : 'POST';
      const url = draftData.draftId ? `/emails/${draftData.draftId}` : '/emails';

      const response = await fetchApi(url, {
        method: method,
        body: JSON.stringify(draftEmailData)
      });

      if (response.success) {
        if (showSuccessNotification) {
          showNotification('Brouillon sauvegardé avec succès', 'success');
        }
        
        // Mettre à jour l'ID du brouillon si c'est un nouveau brouillon
        if (!draftData.draftId && response.data?._id) {
          setNewEmail(prev => ({
            ...prev,
            draftId: response.data._id
          }));
        }

        // Recharger les threads si on est dans le dossier brouillons
        if (currentFolder === 'drafts') {
          loadThreads();
        }

        return response.data;
      } else {
        if (showSuccessNotification) {
          showNotification('Erreur lors de la sauvegarde du brouillon', 'error');
        }
        return false;
      }

    } catch (tokenError) {
      console.error('Erreur lors du décodage du token:', tokenError);
      if (showSuccessNotification) {
        showNotification('Erreur d\'authentification', 'error');
      }
      return false;
    }

  } catch (error) {
    console.error('Erreur lors de la sauvegarde du brouillon:', error);
    if (showSuccessNotification) {
      showNotification('Erreur lors de la sauvegarde du brouillon', 'error');
    }
    return false;
  } finally {
    setIsLoading(false);
  }
};

// Fonction pour sauvegarder automatiquement (sans notification)
const autoSaveDraft = useCallback(
  debounce(() => {
    if (isComposing && (newEmail.subject || newEmail.body || newEmail.to.length > 0)) {
      saveDraft(null, false); // false = pas de notification
    }
  }, 2000), // Attendre 2 secondes après la dernière modification
  [newEmail, isComposing]
);

// Fonction utilitaire pour le debounce
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Fonction pour charger un brouillon existant
const loadDraft = async (draftId) => {
  try {
    setIsLoadingThread(true);
    
    const response = await fetchApi(`/emails/${draftId}`);
    
    if (response.success && response.data) {
      const draft = response.data;
      
      // Formater les destinataires pour l'affichage
      const formatForDisplay = (recipients) => {
        return recipients.map(r => 
          r.name ? `${r.name} <${r.email}>` : r.email
        );
      };

      setNewEmail({
        subject: draft.subject || '',
        body: draft.body || '',
        to: formatForDisplay(draft.recipients?.to || []),
        cc: formatForDisplay(draft.recipients?.cc || []),
        bcc: formatForDisplay(draft.recipients?.bcc || []),
        attachments: draft.attachments || [],
        isDraft: true,
        draftId: draft._id
      });
      
      setIsComposing(true);
      showNotification('Brouillon chargé', 'success');
    }
  } catch (error) {
    console.error('Erreur lors du chargement du brouillon:', error);
    showNotification('Erreur lors du chargement du brouillon', 'error');
  } finally {
    setIsLoadingThread(false);
  }
};

// Fonction pour supprimer un brouillon
const deleteDraft = async (draftId) => {
  try {
    const response = await fetchApi(`/emails/${draftId}`, {
      method: 'DELETE'
    });
    
    if (response.success) {
      showNotification('Brouillon supprimé', 'success');
      
      // Si on supprime le brouillon actuellement en cours de composition
      if (newEmail.draftId === draftId) {
        setNewEmail({
          subject: '',
          body: '',
          to: [],
          cc: [],
          bcc: [],
          attachments: [],
          isDraft: false
        });
        setIsComposing(false);
      }
      
      // Recharger les threads si on est dans le dossier brouillons
      if (currentFolder === 'drafts') {
        loadThreads();
      }
    }
  } catch (error) {
    console.error('Erreur lors de la suppression du brouillon:', error);
    showNotification('Erreur lors de la suppression du brouillon', 'error');
  }
};

const deleteDraftPermanently = async (draftId) => {
  try {
    const response = await fetchApi(`/emails/${draftId}/permanent`, {
      method: 'DELETE'
    });
    
    if (response.success) {
      showNotification('Brouillon supprimé définitivement', 'success');
      
      // Recharger les threads si on est dans la corbeille
      if (currentFolder === 'trash') {
        loadThreads();
      }
    }
  } catch (error) {
    console.error('Erreur lors de la suppression définitive:', error);
    showNotification('Erreur lors de la suppression définitive', 'error');
  }
};

const handleEmailOpen = async (threadOrEmail) => {
  try {
    // Vérifier si c'est un brouillon
    const isDraft = threadOrEmail.isDraft || threadOrEmail.previewEmail?.isDraft;
    
    if (isDraft) {
      // CORRECTION: Meilleure logique pour récupérer l'ID du brouillon
      let draftId;
      
      // Si c'est un thread avec previewEmail (structure de thread)
      if (threadOrEmail.previewEmail && threadOrEmail.previewEmail._id) {
        draftId = threadOrEmail.previewEmail._id;
      }
      // Si c'est directement un email/brouillon
      else if (threadOrEmail._id) {
        draftId = threadOrEmail._id;
      }
      
      if (!draftId) {
        console.error('ID du brouillon introuvable:', threadOrEmail);
        showNotification('Impossible d\'identifier le brouillon', 'error');
        return;
      }
      
      console.log('Ouverture du brouillon avec ID:', draftId);
      
      // CORRECTION: Vérifier que l'ID est valide (format MongoDB ObjectId)
      if (!draftId.match(/^[0-9a-fA-F]{24}$/)) {
        console.error('Format d\'ID invalide:', draftId);
        showNotification('Format d\'ID de brouillon invalide', 'error');
        return;
      }
      
      await loadDraftForEditing(draftId);
    } else {
      // C'est un email normal - ouvrir avec openThread
      const threadId = threadOrEmail._id;
      await openThread(threadId);
    }
  } catch (error) {
    console.error('Erreur lors de l\'ouverture de l\'email:', error);
    showNotification(`Erreur lors de l\'ouverture de l\'email: ${error.message}`, 'error');
  }
};
const loadDraftForEditing = async (draftId) => {
  try {
    setIsLoadingThread(true);
    
    console.log('=== DEBUG AUTORISATION BROUILLON ===');
    console.log('ID du brouillon à charger:', draftId);
    
    // Vérifier le token et les infos utilisateur
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        console.log('Infos utilisateur depuis le token:', {
          userId: payload.id || payload.userId || payload.sub,
          email: payload.email || payload.sub,
          exp: payload.exp ? new Date(payload.exp * 1000) : 'N/A'
        });
      } catch (tokenError) {
        console.error('Erreur décodage token:', tokenError);
      }
    }
    
    // Vérifier que l'ID est valide
    if (!draftId) {
      throw new Error('ID du brouillon manquant');
    }
    
    if (!draftId.match(/^[0-9a-fA-F]{24}$/)) {
      throw new Error('Format d\'ID invalide');
    }
    
    console.log('Requête API vers:', `/emails/${draftId}?isDraft=true`);
    
    const response = await fetchApi(`/emails/${draftId}?isDraft=true`);
    
    console.log('Réponse complète API:', response);
    
    if (response && response.success !== false && response.data) {
      const draft = response.data;
      console.log('Brouillon chargé avec succès:', {
        id: draft._id,
        isDraft: draft.isDraft,
        sender: draft.sender,
        subject: draft.subject?.substring(0, 50) + '...'
      });
      
      if (!draft.isDraft) {
        throw new Error('L\'email trouvé n\'est pas un brouillon');
      }
      
      setSelectedDraft(draft);
    } else {
      const errorMessage = response?.error || response?.message || 'Brouillon non trouvé';
      console.error('Erreur API détaillée:', {
        success: response?.success,
        error: response?.error,
        message: response?.message,
        status: response?.status
      });
      throw new Error(errorMessage);
    }
  } catch (error) {
    console.error('Erreur lors du chargement du brouillon:', error);
    showNotification(`Erreur: ${error.message}`, 'error');
  } finally {
    setIsLoadingThread(false);
  }
};
// Fonction pour envoyer un brouillon depuis DraftModal
const handleSendDraft = async (emailData) => {
  try {
    setIsLoading(true);
    
    // Vérification des champs requis
    if (!emailData.subject.trim() || !emailData.body.trim() || emailData.to.length === 0) {
      showNotification('Veuillez remplir tous les champs requis', 'error');
      return false;
    }

    // Obtenir les informations utilisateur depuis le token
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userData = {
      email: payload.email || payload.sub || 'user@example.com',
      userId: payload.id || payload.userId || payload.sub || 'user-id'
    };

    // Convertir les pièces jointes en Base64
    const processedAttachments = await Promise.all(
      (emailData.attachments || []).map(async (attachment) => {
        if (attachment.file && !attachment.data) {
          const base64Data = await fileToBase64(attachment.file);
          return {
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            data: base64Data
          };
        }
        return attachment;
      })
    );

    const emailToSend = {
      subject: emailData.subject,
      body: emailData.body,
      recipients: {
        to: emailData.to,
        cc: emailData.cc || [],
        bcc: emailData.bcc || []
      },
      attachments: processedAttachments,
      sender: {
        email: userData.email,
        userId: userData.userId
      },
      isDraft: false,
      sentAt: new Date()
    };

    // Envoyer l'email
    const response = await fetchApi(`/emails/${selectedDraft._id}`, {
      method: 'PUT',
      body: JSON.stringify(emailToSend)
    });

    if (response.success) {
      showNotification('Email envoyé avec succès', 'success');
      setSelectedDraft(null);
      loadThreads(); // Recharger la liste
      return true;
    } else {
      showNotification('Erreur lors de l\'envoi de l\'email', 'error');
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de l\'envoi du brouillon:', error);
    showNotification('Erreur lors de l\'envoi de l\'email', 'error');
    return false;
  } finally {
    setIsLoading(false);
  }
};

// Fonction pour sauvegarder un brouillon depuis DraftModal
const handleSaveDraftFromModal = async (emailData) => {
  try {
    setIsLoading(true);
    
    // Obtenir les informations utilisateur depuis le token
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userData = {
      email: payload.email || payload.sub || 'user@example.com',
      userId: payload.id || payload.userId || payload.sub || 'user-id'
    };

    // Convertir les pièces jointes en Base64
    const processedAttachments = await Promise.all(
      (emailData.attachments || []).map(async (attachment) => {
        if (attachment.file && !attachment.data) {
          const base64Data = await fileToBase64(attachment.file);
          return {
            name: attachment.name,
            type: attachment.type,
            size: attachment.size,
            data: base64Data
          };
        }
        return attachment;
      })
    );

    const draftToSave = {
      subject: emailData.subject || '',
      body: emailData.body || '',
      recipients: {
        to: emailData.to || [],
        cc: emailData.cc || [],
        bcc: emailData.bcc || []
      },
      attachments: processedAttachments,
      sender: {
        email: userData.email,
        userId: userData.userId
      },
      isDraft: true
    };

    // Sauvegarder le brouillon
    const response = await fetchApi(`/emails/${selectedDraft._id}`, {
      method: 'PUT',
      body: JSON.stringify(draftToSave)
    });

    if (response.success) {
      showNotification('Brouillon sauvegardé avec succès', 'success');
      // Mettre à jour le brouillon sélectionné avec les nouvelles données
      setSelectedDraft(prev => ({
        ...prev,
        ...draftToSave,
        _id: prev._id
      }));
      loadThreads(); // Recharger la liste
      return true;
    } else {
      showNotification('Erreur lors de la sauvegarde du brouillon', 'error');
      return false;
    }
  } catch (error) {
    console.error('Erreur lors de la sauvegarde du brouillon:', error);
    showNotification('Erreur lors de la sauvegarde du brouillon', 'error');
    return false;
  } finally {
    setIsLoading(false);
  }
};

// Fonction pour supprimer un brouillon depuis DraftModal
const handleDeleteDraftFromModal = async () => {
  if (!selectedDraft) return;
  
  if (window.confirm('Êtes-vous sûr de vouloir supprimer ce brouillon ?')) {
    try {
      const response = await fetchApi(`/emails/${selectedDraft._id}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        showNotification('Brouillon supprimé', 'success');
        setSelectedDraft(null);
        loadThreads(); // Recharger la liste
      }
    } catch (error) {
      console.error('Erreur lors de la suppression du brouillon:', error);
      showNotification('Erreur lors de la suppression du brouillon', 'error');
    }
  }
};


//   const loadThreads = useCallback(async () => {
//   setIsLoading(true);
//   try {
//     const encryptionPassword = sessionStorage.getItem('encryptionPassword');

//     // Construire les paramètres de requête
//     const params = new URLSearchParams({
//       page: currentPage,
//       limit,
//       folder: currentFolder === 'Inbox' ? 'inbox' : currentFolder,
//       groupByThread: 'true'
//     });

//     if (searchQuery) {
//       params.append('search', searchQuery);
//       params.append('searchInUsers', 'true');
//     }
//  // Si un label est sélectionné, utilisez la nouvelle route de filtrage
//       const endpoint = selectedLabelId 
//         ? `/emails/filter-by-label?labelId=${selectedLabelId}&${params.toString()}`
//         : `/emails?${params.toString()}`;

//     if (encryptionPassword) {
//       params.append('password', encryptionPassword);
//     }

//     const response = await fetchApi(`/emails?${params.toString()}`);
    
//     if (response.success) {
//       const threadMap = new Map();
      
//       response.data.forEach(email => {
//         // CORRECTION: Meilleure logique pour les brouillons
//         let threadId;
        
//         // Pour les brouillons, chaque brouillon est son propre thread
//         if (email.isDraft) {
//           threadId = email._id;
//         } else {
//           // Pour les emails normaux, utiliser le threadId ou l'_id
//           threadId = email.threadId?._id || email._id;
//         }
        
//         if (!threadMap.has(threadId)) {
//           threadMap.set(threadId, {
//             _id: threadId,
//             subject: email.subject || 'Sans objet',
//             lastMessageAt: email.sentAt || email.createdAt || new Date(),
//             participants: email.threadId?.participants || [],
//             previewEmail: {
//               ...email,
//               // CORRECTION: S'assurer que l'ID est bien présent
//               _id: email._id
//             },
//             unreadCount: email.userEmailStatus?.isRead === false ? 1 : 0,
//             isDraft: email.isDraft || false,
//             // CORRECTION: Ajouter des métadonnées utiles pour le debug
//             emailCount: 1,
//             type: email.isDraft ? 'draft' : 'email'
//           });
//         } else {
//           const thread = threadMap.get(threadId);
          
//           // Mettre à jour le dernier message si celui-ci est plus récent
//           const emailDate = new Date(email.sentAt || email.createdAt || new Date());
//           const threadDate = new Date(thread.lastMessageAt);
          
//           if (emailDate > threadDate) {
//             thread.lastMessageAt = email.sentAt || email.createdAt;
//             thread.previewEmail = {
//               ...email,
//               _id: email._id
//             };
//           }
          
//           // Incrémenter le nombre d'emails non lus
//           if (email.userEmailStatus?.isRead === false) {
//             thread.unreadCount++;
//           }
          
//           thread.emailCount++;
//         }
//       });
      
//       // Convertir la Map en tableau et trier par date du dernier message
//       const sortedThreads = Array.from(threadMap.values())
//         .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      
//       console.log('Threads chargés:', sortedThreads);
      
//       // CORRECTION: Log spécifique pour les brouillons
//       const drafts = sortedThreads.filter(t => t.isDraft);
//       if (drafts.length > 0) {
//         console.log('Brouillons trouvés:', drafts);
//       }
      
//       setThreads(sortedThreads);
//       setTotalPages(response.pages);
//       setTotalThreads(response.total);
//     }
//   } catch (error) {
//     console.error('Error loading threads:', error);
//     showNotification('Erreur lors du chargement des conversations', 'error');
//   } finally {
//     setIsLoading(false);
//   }
// }, [currentPage, searchQuery, currentFolder, selectedLabelId, limit, fetchApi]);


  // Charger les threads au montage et lors des changements de paramètres
 

const loadThreads = useCallback(async () => {
  setIsLoading(true);
  try {
    const encryptionPassword = sessionStorage.getItem('encryptionPassword');


    // Construire les paramètres de requête
    const params = new URLSearchParams({
      page: currentPage,
      limit,
      folder: currentFolder === 'Inbox' ? 'inbox' : currentFolder,
      groupByThread: 'true'
    });


    if (searchQuery) {
      params.append('search', searchQuery);
      params.append('searchInUsers', 'true');
    }


    if (encryptionPassword) {
      params.append('password', encryptionPassword);
    }


    // Ajouter le labelId comme paramètre si un label est sélectionné
    if (selectedLabelId && currentFolder === 'inbox') {
      params.append('labelId', selectedLabelId);
    }


    const response = await fetchApi(`/emails?${params.toString()}`);
   
    if (response.success) {
      const threadMap = new Map();
     
      // Filtrer les emails en fonction du label côté client si nécessaire
      let emails = response.data;
     
      if (selectedLabelId && currentFolder === 'inbox') {
        // Trouver le label sélectionné
        const selectedLabel = emailLabels.find(label => label._id === selectedLabelId);
       
        if (selectedLabel) {
          // Filtrer les emails dont l'expéditeur correspond aux emails associés au label
          emails = emails.filter(email => {
            const senderEmail = email.sender?.email?.toLowerCase();
            return selectedLabel.associatedEmails?.some(labelEmail =>
              labelEmail.toLowerCase() === senderEmail
            );
          });
        }
      }


      emails.forEach(email => {
        let threadId;
       
        if (email.isDraft) {
          threadId = email._id;
        } else {
          threadId = email.threadId?._id || email._id;
        }
       
        if (!threadMap.has(threadId)) {
          threadMap.set(threadId, {
            _id: threadId,
            subject: email.subject || 'Sans objet',
            lastMessageAt: email.sentAt || email.createdAt || new Date(),
            participants: email.threadId?.participants || [],
            previewEmail: {
              ...email,
              _id: email._id
            },
            unreadCount: email.userEmailStatus?.isRead === false ? 1 : 0,
            isDraft: email.isDraft || false,
            emailCount: 1,
            type: email.isDraft ? 'draft' : 'email'
          });
        } else {
          const thread = threadMap.get(threadId);
          const emailDate = new Date(email.sentAt || email.createdAt || new Date());
          const threadDate = new Date(thread.lastMessageAt);
         
          if (emailDate > threadDate) {
            thread.lastMessageAt = email.sentAt || email.createdAt;
            thread.previewEmail = {
              ...email,
              _id: email._id
            };
          }
         
          if (email.userEmailStatus?.isRead === false) {
            thread.unreadCount++;
          }
         
          thread.emailCount++;
        }
      });
     
      const sortedThreads = Array.from(threadMap.values())
        .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
     
      setThreads(sortedThreads);
      setTotalPages(response.pages || 1);
      setTotalThreads(response.total || sortedThreads.length);
    }
  } catch (error) {
    console.error('Error loading threads:', error);
    showNotification('Erreur lors du chargement des conversations', 'error');
  } finally {
    setIsLoading(false);
  }
}, [currentPage, searchQuery, currentFolder, selectedLabelId, limit, fetchApi, emailLabels]);
 
  useEffect(() => {
    loadThreads();
  }, [loadThreads]);




//  const loadThreads = useCallback(async () => {
//   setIsLoading(true);
//   try {
//     const encryptionPassword = sessionStorage.getItem('encryptionPassword');

//     // Construire les paramètres de requête
//     const params = new URLSearchParams({
//       page: currentPage,
//       limit,
//       folder: currentFolder === 'Inbox' ? 'inbox' : currentFolder,
//       groupByThread: 'true'
//     });

//     if (searchQuery) {
//       params.append('search', searchQuery);
//       params.append('searchInUsers', 'true');
//     }

//     if (encryptionPassword) {
//       params.append('password', encryptionPassword);
//     }

//     // CORRECTION: Utiliser le bon endpoint selon le filtre
//     const endpoint = selectedLabelId 
//       ? `/emails/filter-by-label?labelId=${selectedLabelId}&${params.toString()}`
//       : `/emails?${params.toString()}`;

//     // CORRECTION: Utiliser la variable endpoint au lieu de reconstruire l'URL
//     const response = await fetchApi(endpoint);
    
//     if (response.success) {
//       const threadMap = new Map();
      
//       response.data.forEach(email => {
//         // CORRECTION: Meilleure logique pour les brouillons
//         let threadId;
        
//         // Pour les brouillons, chaque brouillon est son propre thread
//         if (email.isDraft) {
//           threadId = email._id;
//         } else {
//           // Pour les emails normaux, utiliser le threadId ou l'_id
//           threadId = email.threadId?._id || email._id;
//         }
        
//         if (!threadMap.has(threadId)) {
//           threadMap.set(threadId, {
//             _id: threadId,
//             subject: email.subject || 'Sans objet',
//             lastMessageAt: email.sentAt || email.createdAt || new Date(),
//             participants: email.threadId?.participants || [],
//             previewEmail: {
//               ...email,
//               // CORRECTION: S'assurer que l'ID est bien présent
//               _id: email._id
//             },
//             unreadCount: email.userEmailStatus?.isRead === false ? 1 : 0,
//             isDraft: email.isDraft || false,
//             // CORRECTION: Ajouter des métadonnées utiles pour le debug
//             emailCount: 1,
//             type: email.isDraft ? 'draft' : 'email'
//           });
//         } else {
//           const thread = threadMap.get(threadId);
          
//           // Mettre à jour le dernier message si celui-ci est plus récent
//           const emailDate = new Date(email.sentAt || email.createdAt || new Date());
//           const threadDate = new Date(thread.lastMessageAt);
          
//           if (emailDate > threadDate) {
//             thread.lastMessageAt = email.sentAt || email.createdAt;
//             thread.previewEmail = {
//               ...email,
//               _id: email._id
//             };
//           }
          
//           // Incrémenter le nombre d'emails non lus
//           if (email.userEmailStatus?.isRead === false) {
//             thread.unreadCount++;
//           }
          
//           thread.emailCount++;
//         }
//       });
      
//       // Convertir la Map en tableau et trier par date du dernier message
//       const sortedThreads = Array.from(threadMap.values())
//         .sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));
      
//       console.log('Threads chargés avec endpoint:', endpoint);
//       console.log('Threads chargés:', sortedThreads);
      
//       // CORRECTION: Log spécifique pour les brouillons
//       const drafts = sortedThreads.filter(t => t.isDraft);
//       if (drafts.length > 0) {
//         console.log('Brouillons trouvés:', drafts);
//       }
      
//       setThreads(sortedThreads);
//       setTotalPages(response.pages);
//       setTotalThreads(response.total);
//     }
//   } catch (error) {
//     console.error('Error loading threads:', error);
//     showNotification('Erreur lors du chargement des conversations', 'error');
//   } finally {
//     setIsLoading(false);
//   }
// }, [currentPage, searchQuery, currentFolder, selectedLabelId, limit, fetchApi]);
 
//   useEffect(() => {
//     loadThreads();
//   }, [loadThreads]);



  
 useEffect(() => {
    const fetchLabels = async () => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch('https://runova.onrender.com/api/labels', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
  
        if (!response.ok) {
          throw new Error('Erreur lors du chargement des labels');
        }
  
        const result = await response.json();
        const allLabels = result.data?.labels || [];
  
        const filteredEmailLabels = allLabels.filter(label => label.type === 'email');
        setEmailLabels(filteredEmailLabels);
  
        console.log("Labels filtrés (type email) :", filteredEmailLabels);
      } catch (err) {
        console.error("Erreur lors du fetch des labels :", err);
      }
    };
  
    fetchLabels();
  }, []);
  

  console.log("Labels chargés:", emailLabels);


  // Fonction pour charger tous les emails d'un thread
 const loadThreadEmails = async (threadId) => {
  setIsLoadingThread(true);
  try {
    const encryptionPassword = sessionStorage.getItem('encryptionPassword');
    const params = new URLSearchParams();
    
    if (encryptionPassword) {
      params.append('password', encryptionPassword);
    }
    
    const url = `/emails/thread/${threadId}${params.toString() ? `?${params.toString()}` : ''}`;
    const response = await fetchApi(url);
    
    if (response.success) {
      setThreadEmails(response.data);
      setSelectedThreadId(threadId);
    }
  } catch (error) {
      console.error('Error loading thread emails:', error);
      showNotification('Erreur lors du chargement des emails de la conversation', 'error');
    } finally {
      setIsLoadingThread(false);
    }
  };

  // Fonction pour afficher une notification
  const showNotification = (message, type = 'info') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Fonction pour ouvrir un thread
  const openThread = async (threadId) => {
    await loadThreadEmails(threadId);
    
    // Marquer les emails comme lus
    // Note: Ceci pourrait être géré dans le backend lorsque les emails du thread sont récupérés
    try {
      const response = await fetchApi(`/threads/${threadId}/read`, {
        method: 'PATCH'
      });
      
      if (response.success) {
        // Mettre à jour l'état local pour refléter que les emails sont lus
        setThreads(prevThreads => 
          prevThreads.map(thread => 
            thread._id === threadId 
              ? { ...thread, unreadCount: 0 } 
              : thread
          )
        );
      }
    } catch (error) {
      console.error('Error marking thread as read:', error);
    }
  };
// Fonction pour obtenir les destinataires selon le type de réponse
  const getReplyRecipients = (lastEmail, currentUserEmail, type) => {
    const recipients = { to: [], cc: [], bcc: [] };
    
    switch (type) {
      case 'reply':
        // Répondre uniquement à l'expéditeur
        recipients.to = [{ email: lastEmail.sender.email, name: lastEmail.sender.name }];
        break;
        
      case 'replyAll':
        // Répondre à tous sauf à soi-même
        recipients.to = [{ email: lastEmail.sender.email, name: lastEmail.sender.name }];
        
        // Ajouter tous les destinataires originaux en CC, sauf l'utilisateur actuel
        const filteredTo = lastEmail.recipients.to.filter(r => r.email !== currentUserEmail);
        const filteredCc = lastEmail.recipients.cc.filter(r => r.email !== currentUserEmail);
        
        recipients.cc = [...filteredTo, ...filteredCc];
        break;
        
      case 'forward':
        // Pour le transfert, laisser vide - l'utilisateur choisira
        break;
        
      default:
        recipients.to = [{ email: lastEmail.sender.email, name: lastEmail.sender.name }];
    }
    
    return recipients;
  };

  // Fonction pour initier une réponse
  const startReply = (type = 'reply') => {
    const lastEmail = threadEmails[threadEmails.length - 1];
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    let currentUserEmail = '';
    try {
      const tokenParts = token.split('.');
      const payload = JSON.parse(atob(tokenParts[1]));
      currentUserEmail = payload.email || payload.sub;
    } catch (error) {
      console.error('Erreur lors du décodage du token:', error);
    }
    
    const recipients = getReplyRecipients(lastEmail, currentUserEmail, type);
    
    setReplyType(type);
    setReplyRecipients(recipients);
    setReplyContent('');
    setReplyAttachments([]);
    setIsReplying(true);
  };
const addAttachment = (file) => {
  // Créer directement l'URL d'objet sans passer par FileReader
  const url = URL.createObjectURL(file);
  
  const attachment = {
    name: file.name,
    url: url,
    type: file.type,
    size: file.size,
    file: file // Garder une référence au fichier original
  };
  
  setNewEmail(prev => ({
    ...prev,
    attachments: [...prev.attachments, attachment]
  }));
};


const downloadAttachment = (attachment) => {
  try {
    if (!attachment.data) {
      console.error('Pas de données pour', attachment.name);
       showNotification('ce fichier est chiffre, vous ne pouvez pas le telecharger','info')
      return;
    }
    
    // Créer un blob à partir des données base64
    const byteCharacters = atob(attachment.data);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: attachment.type });
    
    // Créer et déclencher le téléchargement
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = attachment.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    console.log(`✅ Téléchargement de ${attachment.name} réussi`);
      showNotification(` Téléchargement de ${attachment.name} réussi`,'success')
  } catch (error) {
    console.error('Erreur téléchargement:', error);
    showNotification('Erreur lors du téléchargement', 'error');
  }
};

  // Fonction pour envoyer une réponse (modifiée)
 const sendReply = async () => {
  if (!replyContent.trim() || !selectedThreadId) return;
  
  try {
    setIsLoading(true);
    
    // Récupérer le dernier email du thread pour la réponse
    const lastEmail = threadEmails[threadEmails.length - 1];
    
    // Récupération du token d'authentification
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
    if (!token) {
      showNotification('Vous devez être connecté pour envoyer un email', 'error');
      navigate('/login');
      return;
    }
    
    // Décodage du token JWT pour extraire les informations d'utilisateur
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length < 2) {
        throw new Error("Format de token invalide");
      }
      
      // Décodage de la partie "payload" du token
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // Extraction des informations utilisateur depuis le token
      const userData = {
        email: payload.email || payload.sub,
        userId: payload.id || payload.userId || payload.sub
      };
      
      // Convertir les pièces jointes en Base64
      const processedAttachments = await Promise.all(
        replyAttachments.map(async (attachment) => {
          if (attachment.file) {
            const base64Data = await fileToBase64(attachment.file);
            return {
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              data: base64Data // Base64 data avec prefix (data:type;base64,...)
            };
          }
          return attachment;
        })
      );
      
      let replyData;
      
      if (replyType === 'forward') {
        // Pour le transfert
        replyData = {
          subject: `Fwd: ${lastEmail.subject}`,
          body: `\n\n---------- Message transféré ----------\n` +
                `De: ${lastEmail.sender.name || lastEmail.sender.email}\n` +
                `Date: ${new Date(lastEmail.sentAt).toLocaleString('fr-FR')}\n` +
                `Objet: ${lastEmail.subject}\n` +
                `À: ${lastEmail.recipients.to.map(r => r.name || r.email).join(', ')}\n\n` +
                lastEmail.body + '\n' + replyContent,
          recipients: {
            to: replyRecipients.to,
            cc: replyRecipients.cc,
            bcc: replyRecipients.bcc
          },
          attachments: processedAttachments,
          sender: {
            email: userData.email,
            userId: userData.userId
          },
          isDraft: false
        };
      } else {
        // Pour reply ou replyAll
        replyData = {
          threadId: selectedThreadId,
          parentEmailId: lastEmail._id,
          subject: `Re: ${lastEmail.subject}`,
          body: replyContent,
          recipients: {
            to: replyRecipients.to,
            cc: replyRecipients.cc,
            bcc: replyRecipients.bcc
          },
          attachments: processedAttachments,
          sender: {
            email: userData.email,
            userId: userData.userId
          },
          isDraft: false
        };
      }
      
      const response = await fetchApi('/emails', {
        method: 'POST',
        body: JSON.stringify(replyData)
      });
      
      if (response.success) {
        // Nettoyer les URLs d'objets pour éviter les fuites mémoire
        replyAttachments.forEach(attachment => {
          if (attachment.url && attachment.url.startsWith('blob:')) {
            URL.revokeObjectURL(attachment.url);
          }
        });
        
        setReplyContent('');
        setReplyAttachments([]);
        setIsReplying(false);
        setReplyRecipients({ to: [], cc: [], bcc: [] });
        
        const actionText = replyType === 'forward' ? 'transféré' : 
                         replyType === 'replyAll' ? 'envoyée à tous' : 'envoyée';
        showNotification(`Réponse ${actionText} avec succès`, 'success');
        
        // Recharger les emails du thread pour reply/replyAll
        if (replyType !== 'forward') {
          loadThreadEmails(selectedThreadId);
        }
        
        // Si on est dans le dossier envoyés, recharger les threads
        if (currentFolder === 'sent') {
          loadThreads();
        }
      }
    } catch (tokenError) {
      console.error('Erreur lors du décodage du token:', tokenError);
      showNotification('Erreur lors de l\'envoi de la réponse', 'error');
    }
  } catch (error) {
    console.error('Error sending reply:', error);
    showNotification('Erreur lors de l\'envoi de la réponse', 'error');
  } finally {
    setIsLoading(false);
  }
};
const addReplyAttachment = (file) => {
  // Créer directement l'URL d'objet sans passer par FileReader
  const url = URL.createObjectURL(file);
  
  const attachment = {
    name: file.name,
    url: url,
    type: file.type,
    size: file.size,
    file: file // Garder une référence au fichier original
  };
  
  setReplyAttachments(prev => [...prev, attachment]);
};

// Fonction pour convertir un fichier en Base64 (pour l'envoi au serveur)
const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      // IMPORTANT: Enlever le préfixe "data:type;base64," pour garder seulement les données
      const base64String = reader.result.split(',')[1];
      resolve(base64String);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

  // Fonction pour retirer une pièce jointe de la réponse
 const removeReplyAttachment = (index) => {
  const attachment = replyAttachments[index];
  
  // Nettoyer l'URL d'objet pour éviter les fuites mémoire
  if (attachment && attachment.url && attachment.url.startsWith('blob:')) {
    URL.revokeObjectURL(attachment.url);
  }
  
  setReplyAttachments(prev => prev.filter((_, i) => i !== index));
};

  const sendNewEmail = async () => {
  if (!newEmail.subject.trim() || !newEmail.body.trim() || newEmail.to.length === 0) {
    showNotification('Veuillez remplir tous les champs obligatoires', 'error');
    return;
  }

  try {
    setIsLoading(true);

    const formatRecipients = recipients =>
      recipients.map(r => {
        if (!r) return null;
        const emailMatch = r.match(/<(.+)>/);
        const nameMatch = r.match(/(.+)</);
        const [email, name] = r.includes('<')
          ? [emailMatch ? emailMatch[1] : r, nameMatch ? nameMatch[1].trim() : '']
          : [r, ''];
        return { email, name };
      }).filter(Boolean);

    // Récupération du token d'authentification
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
    if (!token) {
      showNotification('Vous devez être connecté pour envoyer un email', 'error');
      navigate('/login');
      return;
    }
    
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length < 2) {
        throw new Error("Format de token invalide");
      }
      
      // Décodage de la partie "payload" du token
      const payload = JSON.parse(atob(tokenParts[1]));
      
      // Extraction des informations utilisateur depuis le token
      const userData = {
        email: payload.email || payload.sub || 'user@example.com',
        userId: payload.id || payload.userId || payload.sub || 'user-id'
      };
      
      // Convertir les pièces jointes en Base64
       const processedAttachments = await Promise.all(
      newEmail.attachments.map(async (attachment) => {
        if (attachment.file) {
          try {
            console.log(`📎 Traitement de ${attachment.name} (${attachment.size} bytes)`);
            
            // Obtenir SEULEMENT les données base64 (sans préfixe)
            const base64Data = await fileToBase64(attachment.file);
            
            // Validation des données
            if (!base64Data || base64Data.length === 0) {
              throw new Error(`Données vides pour ${attachment.name}`);
            }
            
            console.log(`✅ ${attachment.name} converti: ${base64Data.length} caractères base64`);
            
            return {
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              data: base64Data // SEULEMENT les données base64 pures
            };
          } catch (error) {
            console.error(`❌ Erreur traitement ${attachment.name}:`, error);
            return {
              name: attachment.name,
              type: attachment.type,
              size: attachment.size,
              data: null,
              error: error.message
            };
          }
        }
        return attachment;
      })
    );
    
    // Log des attachments traités
    console.log(`📊 ${processedAttachments.length} pièces jointes traitées:`, 
      processedAttachments.map(a => `${a.name} (${a.data ? 'OK' : 'ERREUR'})`));
    
    const emailData = {
      subject: newEmail.subject,
      body: newEmail.body,
      recipients: {
        to: formatRecipients(newEmail.to),
        cc: formatRecipients(newEmail.cc),
        bcc: formatRecipients(newEmail.bcc)
      },
      attachments: processedAttachments,
      sender: {
        email: userData.email,
        userId: userData.userId
      },
      isDraft: false
    };
    
      const response = await fetchApi('/emails', {
        method: 'POST',
        body: JSON.stringify(emailData)
      });

      if (response.success) {
        // Nettoyer les URLs d'objets pour éviter les fuites mémoire
        newEmail.attachments.forEach(attachment => {
          if (attachment.url && attachment.url.startsWith('blob:')) {
            URL.revokeObjectURL(attachment.url);
          }
        });
        
        setNewEmail({
          subject: '',
          body: '',
          to: [],
          cc: [],
          bcc: [],
          attachments: [],
          isDraft: false
        });
        setIsComposing(false);
        showNotification('Email envoyé avec succès', 'success');
        
        // Si on est dans le dossier envoyés, recharger les threads
        if (currentFolder === 'sent') loadThreads();
      }
    } catch (tokenError) {
      console.error('Erreur lors du décodage du token:', tokenError);
      showNotification('Erreur lors de l\'envoi de l\'email', 'error');
    }
  } catch (error) {
    console.error('Error sending email:', error);
    showNotification('Erreur lors de l\'envoi de l\'email', 'error');
  } finally {
    setIsLoading(false);
  }
};

  // Fonction pour marquer un thread comme important
  const toggleImportant = async (threadId, event) => {
    if (event) event.stopPropagation();
    
    try {
      const thread = threads.find(t => t._id === threadId);
      if (!thread) return;
      
      const isCurrentlyImportant = thread.previewEmail?.userEmailStatus?.isImportant;
      
      // Route corrigée - était auparavant: /emails/thread/${threadId}/important
      const response = await fetchApi(`/threads/${threadId}/${isCurrentlyImportant ? 'unimportant' : 'important'}`, {
        method: 'PATCH'
      });
      
      if (response.success) {
        setThreads(prevThreads => prevThreads.map(t => 
          t._id === threadId ? { 
            ...t, 
            previewEmail: { 
              ...t.previewEmail, 
              userEmailStatus: { 
                ...t.previewEmail.userEmailStatus, 
                isImportant: !isCurrentlyImportant 
              } 
            } 
          } : t
        ));
        
        // Mettre à jour les emails du thread si ce thread est actuellement ouvert
        if (selectedThreadId === threadId) {
          setThreadEmails(prevEmails => prevEmails.map(email => ({
            ...email,
            userEmailStatus: {
              ...email.userEmailStatus,
              isImportant: !isCurrentlyImportant
            }
          })));
        }
        
        showNotification(
          isCurrentlyImportant ? 'Conversation marquée comme non importante' : 'Conversation marquée comme importante',
          'success'
        );
      }
    } catch (error) {
      console.error('Error toggling important status:', error);
      showNotification('Erreur lors du changement de statut important', 'error');
    }
  };
  
  // Pour la fonction toggleArchive
  const toggleArchive = async (threadId, event) => {
    if (event) event.stopPropagation();
    
    try {
      const thread = threads.find(t => t._id === threadId);
      if (!thread) return;
      
      const isCurrentlyArchived = thread.previewEmail?.userEmailStatus?.isArchived;
      
      // Route corrigée - était auparavant: /emails/thread/${threadId}/...
      const response = await fetchApi(`/threads/${threadId}/${isCurrentlyArchived ? 'unarchive' : 'archive'}`, {
        method: 'PATCH'
      });
      
      if (response.success) {
        showNotification(
          isCurrentlyArchived ? 'Conversation désarchivée' : 'Conversation archivée',
          'success'
        );
        
        // Si dans le dossier archives, retirer le thread s'il est désarchivé
        // Si dans un autre dossier, retirer le thread s'il est archivé
        if ((currentFolder === 'archived' && !isCurrentlyArchived) || 
            (currentFolder !== 'archived' && isCurrentlyArchived)) {
          setThreads(prevThreads => prevThreads.filter(t => t._id !== threadId));
          
          if (selectedThreadId === threadId) {
            setSelectedThreadId(null);
            setThreadEmails([]);
          }
        } else {
          setThreads(prevThreads => prevThreads.map(t => 
            t._id === threadId ? { 
              ...t, 
              previewEmail: { 
                ...t.previewEmail, 
                userEmailStatus: { 
                  ...t.previewEmail.userEmailStatus, 
                  isArchived: !isCurrentlyArchived 
                } 
              } 
            } : t
          ));
          
          // Mettre à jour les emails du thread s'il est ouvert
          if (selectedThreadId === threadId) {
            setThreadEmails(prevEmails => prevEmails.map(email => ({
              ...email,
              userEmailStatus: {
                ...email.userEmailStatus,
                isArchived: !isCurrentlyArchived
              }
            })));
          }
        }
      }
    } catch (error) {
      console.error('Error toggling archive status:', error);
      showNotification('Erreur lors du changement de statut archive', 'error');
    }
  };
  
  // Pour la fonction moveToTrash
  const moveToTrash = async (threadId, event) => {
    if (event) event.stopPropagation();
    
    try {
      // Route corrigée - était auparavant: /emails/thread/${threadId}/trash
      const response = await fetchApi(`/threads/${threadId}/trash`, {
        method: 'PATCH'
      });
      
      if (response.success) {
        showNotification('Conversation déplacée vers la corbeille', 'success');
        
        if (currentFolder !== 'trash') {
          setThreads(prevThreads => prevThreads.filter(t => t._id !== threadId));
        }
        
        if (selectedThreadId === threadId) {
          setSelectedThreadId(null);
          setThreadEmails([]);
        }
      }
    } catch (error) {
      console.error('Error moving thread to trash:', error);
      showNotification('Erreur lors du déplacement vers la corbeille', 'error');
    }
  };
  
  // Pour la fonction restoreFromTrash
  const restoreFromTrash = async (threadId, event) => {
    if (event) event.stopPropagation();
    
    try {
      // Route corrigée - était auparavant: /emails/thread/${threadId}/restore
      const response = await fetchApi(`/threads/${threadId}/restore`, {
        method: 'PATCH'
      });
      
      if (response.success) {
        showNotification('Conversation restaurée de la corbeille', 'success');
        
        if (currentFolder === 'trash') {
          setThreads(prevThreads => prevThreads.filter(t => t._id !== threadId));
          
          if (selectedThreadId === threadId) {
            setSelectedThreadId(null);
            setThreadEmails([]);
          }
        }
      }
    } catch (error) {
      console.error('Error restoring thread from trash:', error);
      showNotification('Erreur lors de la restauration depuis la corbeille', 'error');
    }
  };
  
  // Pour la fonction permanentDelete
  const permanentDelete = async (threadId, event) => {
    if (event) event.stopPropagation();
    
    if (!window.confirm('Voulez-vous vraiment supprimer définitivement cette conversation?')) {
      return;
    }
    
    try {
      // Route corrigée - était auparavant: /emails/thread/${threadId}/permanent
      const response = await fetchApi(`/threads/${threadId}`, {
        method: 'DELETE'
      });
      
      if (response.success) {
        showNotification('Conversation définitivement supprimée', 'success');
        
        setThreads(prevThreads => prevThreads.filter(t => t._id !== threadId));
        
        if (selectedThreadId === threadId) {
          setSelectedThreadId(null);
          setThreadEmails([]);
        }
      }
    } catch (error) {
      console.error('Error permanently deleting thread:', error);
      showNotification('Erreur lors de la suppression définitive', 'error');
    }
  };

  // Fonction pour changer de dossier
  const changeFolder = (folder) => {
    
    setCurrentFolder(folder);
    setCurrentPage(1);
    setSelectedThreadId(null);
    setThreadEmails([]);
    setSearchQuery('');
  };

  // Fonction pour rechercher des emails
  const handleSearch = (e) => {
    if (e.key === 'Enter') {
      setSearchQuery(e.target.value);
      setCurrentPage(1);
      setSelectedThreadId(null);
      setThreadEmails([]);
    }
  };

 
  // Fonction pour retirer une pièce jointe d'un nouvel email
const removeAttachment = (index) => {
  const attachment = newEmail.attachments[index];
  
  // Nettoyer l'URL d'objet pour éviter les fuites mémoire
  if (attachment && attachment.url && attachment.url.startsWith('blob:')) {
    URL.revokeObjectURL(attachment.url);
  }
  
  setNewEmail(prev => ({
    ...prev,
    attachments: prev.attachments.filter((_, i) => i !== index)
  }));
};

  // Fonction pour formater la date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date >= today) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (date >= yesterday) {
      return 'Hier';
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };
  
  // Fonction pour formater la taille d'un fichier
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    else if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    else return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  };
  
  const handleLogout = () => {
    // Suppression des tokens
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userData');
    
    // Redirection vers la page de login
    navigate('/login');
  };

  const [userInfo, setUserInfo] = useState({
    name: '',
    email: '',
    profileImage: ''
  });
  
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) return;
  
      try {
        const response = await fetch('https://runova.onrender.com/api/auth/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
  
        const result = await response.json();
  
        if (response.ok && result.data?.user) {
          const user = result.data.user;
          setUserInfo({
            name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            profileImage: user.profilePhoto || 'default-avatar.jpg'
          });
        } else {
          console.error('Erreur lors du chargement du profil');
        }
      } catch (error) {
        console.error('Erreur de requête:', error);
      }
    };
  
    fetchUserProfile();
  }, []);

  return (
  <div className="email-app-container">
      {/* Header */}
      <header className="email-header">
        <div className="logo-container">
          <img src={logo} alt="Logo" className="app-logo" />
        </div>
        <div className="search-container">
          <input
            type="text"
            placeholder="Rechercher..."
            onKeyDown={handleSearch}
            defaultValue={searchQuery}
          />
        </div>
        <div className="user-profile">
        <Notifications />
          <div className="profile-info">
            <span className="user-name" onClick={() => navigate('/profile')}>{userInfo.name}</span>
            <span className="user-email" onClick={() => navigate('/profile')}>{userInfo.email}</span>
          </div>
          <img 
          src={userInfo.profileImage && userInfo.profileImage !== 'default-avatar.jpg'
    ? `https://runova.onrender.com/uploads/profiles/${userInfo.profileImage}`
    : '/default-avatar.jpg'
  } 
  alt="User" 
className="profile-image"
  onClick={() => navigate('/profile')} // Ajout de la redirection
    style={{ cursor: 'pointer' }}
          />
        </div>
      </header>

      <div className="email-content">
        {/* Sidebar */}
        <aside className="email-sidebar">
          <button 
  className="compose-button"
  onClick={() => setIsComposing(true)}
>
  
  <span className="text-label">Nouveau Message</span>
</button>
          
          <nav className="folder-nav">
            <ul>
             <li 
  className={currentFolder === 'inbox' ? 'active' : ''}
  onClick={() => changeFolder('inbox')}
>
  
  <span className="text-label">Boîte de réception</span>
</li>
              <li 
  className={currentFolder === 'sent' ? 'active' : ''}
  onClick={() => changeFolder('sent')}
>
 
  
  <span className="text-label">Envoyés</span>
</li>

<li 
  className={currentFolder === 'drafts' ? 'active' : ''}
  onClick={() => changeFolder('drafts')}
>
 
  <span className="text-label">Brouillons</span>
</li>

<li 
  className={currentFolder === 'important' ? 'active' : ''}
  onClick={() => changeFolder('important')}
>

  <span className="text-label">Important</span>
</li>

<li 
  className={currentFolder === 'archived' ? 'active' : ''}
  onClick={() => changeFolder('archived')}
>
  
  <span className="text-label">Archives</span>
</li>

<li 
  className={currentFolder === 'trash' ? 'active' : ''}
  onClick={() => changeFolder('trash')}
>
  
  <span className="text-label">Corbeille</span>
</li>

<li 
  className={currentFolder === 'contacts' ? 'active' : ''}
  onClick={() => navigate('/contacts')}
>
  
  <span className="text-label">Contacts</span>
</li>
          
            {/* Ajout de la section Catégories */}
            <li onClick={() => setShowCategories(!showCategories)}>
  
  <span className="text-label">Catégories</span>
</li>
            {showCategories && (
             <div className="categories-dropdown">
  <button className="categories-btn" onClick={() => setShowCreateLabelModal(true)}>
    <span className="icon-only">
      <svg className="categories-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 5v14M5 12h14" />
      </svg>
    </span>
    <span className="text-label">Créer un label</span>
  </button>

  <button className="categories-btn" onClick={() => navigate('/labels')}>
    <span className="icon-only">
      <svg className="categories-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 00-3-3.87" />
        <path d="M16 3.13a4 4 0 010 7.75" />
      </svg>
    </span>
    <span className="text-label">Gérer les labels</span>
  </button>
</div>

            )}
           <li onClick={() => navigate('/home')}>
 
  <span className="text-label">A propos</span>
</li>
            </ul>

          {showCreateLabelModal && (
            <div className="label-modal-overlay">
              <div className="label-modal">
                <div className="label-modal-header">
                  <h3>Créer un nouveau label</h3>
                  <button onClick={() => setShowCreateLabelModal(false)}>×</button>
                </div>
                
                {/* Onglets */}
                <div className="label-type-tabs">
                  <button 
                    className={`tab-btn ${labelType === 'email' ? 'active' : ''}`}
                    onClick={() => setLabelType('email')}
                  >
                    Label Email
                  </button>
                  <button 
                    className={`tab-btn ${labelType === 'contact' ? 'active' : ''}`}
                    onClick={() => setLabelType('contact')}
                  >
                    Label Contact
                  </button>
                </div>
                
                <div className="modal-body">
                  {/* Contenu commun */}
                  <div className="label-form-group">
                    <label>Nom du label</label>
                    <input 
                      type="text" 
                      value={newLabelName} 
                      onChange={(e) => setNewLabelName(e.target.value)} 
                      placeholder="Nom du label"
                    />
                  </div>
                  
                  <div className="form-group">
                   <label>Couleur</label>
                    <input 
                      type="color" 
                      value={newLabelColor} 
                      onChange={(e) => setNewLabelColor(e.target.value)} 
                    />
                                    
                  </div>
                  
                  {/* Contenu spécifique au type email */}
                  {labelType === 'email' && (
                    <div className="form-group">
                      <label>Adresses e-mail associées</label>
                      <div className="email-bubble-input">
                        <div className="email-bubbles">
                          {emailList.map((email, index) => (
                            <span key={index} className="email-bubble">
                              {email}
                              <button 
                                className="remove-email" 
                                onClick={() => {
                                  const newList = [...emailList];
                                  newList.splice(index, 1);
                                  setEmailList(newList);
                                }}
                              >
                                ×
                              </button>
                            </span>
                          ))}
                          <input
                            type="text"
                            value={emailInput}
                            onChange={(e) => setEmailInput(e.target.value)}
                            onKeyDown={(e) => {
                              if ((e.key === 'Enter' || e.key === ',') && emailInput.trim()) {
                                e.preventDefault();
                                const trimmed = emailInput.trim().replace(/,+$/, '');
                                if (
                                  !emailList.includes(trimmed) &&
                                  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
                                ) {
                                  setEmailList([...emailList, trimmed]);
                                }
                                setEmailInput('');
                              } else if (e.key === 'Backspace' && !emailInput && emailList.length > 0) {
                                setEmailList(emailList.slice(0, -1));
                              }
                            }}
                            placeholder="Saisir une adresse email et appuyer sur Entrée"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
                
                <div className="label-modal-footer">
                  <button className="label-modal-confirm" onClick={() => setShowCreateLabelModal(false)}>Annuler</button>
                  <button className="label-modal-cancel" onClick={handleCreateLabel}>Créer</button>
                </div>
              </div>
            </div>
          )}

            <div className="user-profile">
          <div className="profile-info">
            <span className="user-name">{userInfo.name}</span>
            <span className="user-email">{userInfo.email}</span>
          </div>
          <img 
            src={
              userInfo.profileImage.startsWith('http') 
                ? userInfo.profileImage 
                : `https://runova.onrender.com/uploads/profiles/${userInfo.profileImage}`
            } 
            alt="Profile" 
            className="profile-image"
          />
         <button className="logout-icon-btn"  title="Déconnexion" onClick={handleLogout}>
  <svg className="logout-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
  <path d="M8 7l-5 5 5 5" />        
  <path d="M3 12h12" /> 
  <path d="M12 19v2a2 2 0 002 2h5a2 2 0 002-2V3a2 2 0 00-2-2h-5a2 2 0 00-2 2v2" />
  </svg>
</button>
      
        </div>
          </nav>
        </aside>

        {/* Vue principale - Liste des emails OU Vue détaillée d'un email */}
        <main className="main-content">
          {!selectedThreadId ? (
            // Liste des threads/emails
            <div className="thread-list-fullscreen">
              <div className="list-header">
                <h3>{currentFolder.charAt(0).toUpperCase() + currentFolder.slice(1)}</h3>
                <div className="list-actions">

               <select
      value={selectedLabelId || ""}
      onChange={(e) => {
        setSelectedLabelId(e.target.value || null);
        setCurrentPage(1);
      }}
      className="label-filter-select"
    >
      <option value="">Tous les emails</option>
      {emailLabels.map(label => (
        <option key={label._id} value={label._id} style={{ color: label.color }}>
          {label.name}
        </option>
      ))}
    </select>
              </div>
              </div>

              {isLoading ? (
                <div className="loading-spinner">Chargement...</div>
              ) : threads.length === 0 ? (
                <div className="empty-state">
                  <p>Aucune conversation trouvée</p>
                </div>
              ) : (
              <ul className="thread-items">
  {threads.map(thread => (
    <li 
      key={thread._id} 
      className={`thread-item ${selectedThreadId === thread._id ? 'selected' : ''} ${
        thread.unreadCount > 0 ? 'unread' : ''
      } ${thread.isDraft || thread.previewEmail?.isDraft ? 'draft-item' : ''}`}
      onClick={() => handleEmailOpen(thread)} // ✅ Changement ici
    >
      <div className="thread-item-content">
        <div className="thread-sender">
          {/* Affichage différent pour les brouillons */}
          {thread.isDraft || thread.previewEmail?.isDraft ? (
            <span className="draft-indicator"> Brouillon</span>
          ) : (
            thread.previewEmail?.sender?.name || thread.previewEmail?.sender?.email
          )}
        </div>
        <div className="thread-subject">
          {thread.subject}
          {thread.unreadCount > 0 && (
            <span className="unread-badge">{thread.unreadCount}</span>
          )}
          {(thread.isDraft || thread.previewEmail?.isDraft) && (
            <span className="draft-badge">Brouillon</span>
          )}
        </div>
        <div className="thread-preview">
          {thread.previewEmail?.body.substring(0, 100)}...
        </div>
      </div>
      <div className="thread-item-actions">
        <span className="thread-date">{formatDate(thread.lastMessageAt)}</span>
        <div className="thread-buttons">
          {/* Boutons différents pour les brouillons */}
          {!(thread.isDraft || thread.previewEmail?.isDraft) && (
            <>
              <button 
                className={`important-button ${thread.previewEmail?.userEmailStatus?.isImportant ? 'active' : ''}`}
                onClick={(e) => toggleImportant(thread._id, e)}
                title={thread.previewEmail?.userEmailStatus?.isImportant ? 'Retirer des importants' : 'Marquer comme important'}
              >
                <StarIcon size={18} />
              </button>
              {currentFolder !== 'trash' ? (
                <>
                  <button 
                    className={`archive-button ${thread.previewEmail?.userEmailStatus?.isArchived ? 'active' : ''}`}
                    onClick={(e) => toggleArchive(thread._id, e)}
                    title={thread.previewEmail?.userEmailStatus?.isArchived ? 'Désarchiver' : 'Archiver'}
                  >
                    <ArchiveIcon size={18} />
                  </button>
                  <button 
                    className="trash-button"
                    onClick={(e) => moveToTrash(thread._id, e)}
                    title="Corbeille"
                  >
                    <Trash2Icon size={18} />
                  </button>
                </>
              ) : (
                <>
                  <button 
                    className="restore-button"
                    onClick={(e) => restoreFromTrash(thread._id, e)}
                    title="Restaurer"
                  >
                    <CornerUpLeftIcon size={18} />
                  </button>
                  <button 
                    className="delete-button"
                    onClick={(e) => permanentDelete(thread._id, e)}
                    title="Supprimer définitivement"
                  >
                    <XCircleIcon size={18} />
                  </button>
                </>
              )}
            </>
          )}
          
          {/* Boutons spécifiques aux brouillons */}
          {(thread.isDraft || thread.previewEmail?.isDraft) && (
            <>
              {currentFolder !== 'trash' ? (
                <button 
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Supprimer ce brouillon ?')) {
                      deleteDraft(thread._id);
                    }
                  }}
                  title="Supprimer le brouillon"
                >
                  <Trash2Icon size={18} />
                </button>
              ) : (
                <button 
                  className="delete-button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('Supprimer définitivement ce brouillon ?')) {
                      deleteDraftPermanently(thread._id);
                    }
                  }}
                  title="Supprimer définitivement le brouillon"
                >
                  <XCircleIcon size={18} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </li>
  ))}
</ul>
              )}
            </div>
          ) : (
            // Vue détaillée d'un email en plein écran
            <div className="email-view-fullscreen">
              {isLoadingThread ? (
                <div className="loading-spinner">Chargement de la conversation...</div>
              ) : threadEmails.length > 0 ? (
                <>
                  {/* Header de l'email en plein écran */}
                  <div className="email-full-header">
                    <div className="email-navigation">
                      <button 
                        className="back-button"
                        onClick={() => setSelectedThreadId(null)}
                        title="Retour à la liste"
                      >
                      </button>
                      <h2 className="email-subject">{threadEmails[0].subject}</h2>

                       <div className="email-actions-group">
                        <button 
                          className={`action-btn important-btn ${threadEmails[0]?.userEmailStatus?.isImportant ? 'active' : ''}`}
                          onClick={() => toggleImportant(selectedThreadId)}
                          title={threadEmails[0]?.userEmailStatus?.isImportant ? 'Retirer des importants' : 'Marquer comme important'}
                        >
                          <Star size={18} fill={threadEmails[0]?.userEmailStatus?.isImportant ? 'currentColor' : 'none'} />
                        </button>
                        
                        {currentFolder !== 'trash' ? (
                          <>
                            <button 
                              className={`action-btn archive-btn ${threadEmails[0]?.userEmailStatus?.isArchived ? 'active' : ''}`}
                              onClick={() => toggleArchive(selectedThreadId)}
                              title={threadEmails[0]?.userEmailStatus?.isArchived ? 'Désarchiver' : 'Archiver'}
                            >
                              <Archive size={18} />
                            </button>
                            <button 
                              className="action-btn trash-btn"
                              onClick={() => moveToTrash(selectedThreadId)}
                              title="Déplacer vers la corbeille"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button 
                              className="action-btn restore-btn"
                              onClick={() => restoreFromTrash(selectedThreadId)}
                              title="Restaurer"
                            >
                              <CornerUpLeft size={18} />
                            </button>
                            <button 
                              className="action-btn delete-btn"
                              onClick={() => permanentDelete(selectedThreadId)}
                              title="Supprimer définitivement"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                  
                  {/* Contenu des emails */}
                  <div className="emails-full-container">
                                      
                    <div className="email-toolbar">
                        <div className="reply-actions-group">
                          <button 
                            className="action-btn reply-btn"
                            onClick={() => startReply('reply')}
                            title="Répondre"
                          >
                            <Reply size={18} />
                          </button>
                          <button 
                            className="action-btn reply-all-btn"
                            onClick={() => startReply('replyAll')}
                            title="Répondre à tous"
                          >
                            <ReplyAll size={18} />
                          </button>
                          <button 
                            className="action-btn forward-btn"
                            onClick={() => startReply('forward')}
                            title="Transférer"
                          >
                            <Forward size={18} />
                          </button>
                        
                      </div>
                    </div>
                    {threadEmails.map((email, index) => (
                      <div className="email-message-full" key={email._id}>
                        <div className="email-header-full">
                          <div className="sender-section">
                            <div className="avatar-large">
                              {email.sender.profileImage ? (
                                <img 
                                  src={email.sender.profileImage} 
                                  alt={`Avatar de ${email.sender.name || email.sender.email}`}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.style.display = "none";
                                    e.target.parentNode.innerHTML = `<div class="avatar-fallback"><User size="24" /></div>`;
                                  }}
                                />
                              ) : (
                                <div className="avatar-fallback">
                                  <User size={24} />
                                </div>
                              )}
                            </div>
                            
                            <div className="sender-info-full">
                              <div className="sender-line">
                                <span className="sender-name-large">{email.sender.name || email.sender.email}</span>
                                <span className="email-timestamp">
                                  <Calendar size={14} />
                                  {new Date(email.sentAt).toLocaleString('fr-FR', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                              
                              <div className="recipients-full">
                                <div className="recipient-line">
                                  <strong>À:</strong> 
                                  <span className="recipients-list">
                                    {email.recipients.to.map(r => r.name || r.email).join(', ')}
                                  </span>
                                </div>
                                {email.recipients.cc.length > 0 && (
                                  <div className="recipient-line">
                                    <strong>Cc:</strong> 
                                    <span className="recipients-list">
                                      {email.recipients.cc.map(r => r.name || r.email).join(', ')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="email-body-full">
                          <div className="email-content">
                            {email.body}
                          </div>
                        </div>
                        
                        {email.attachments && email.attachments.length > 0 && (
                          <div className="attachments-full">
                            <div className="attachments-header">
                              <Paperclip size={16} />
                              <span className="attachments-count">
                                {email.attachments.length} pièce{email.attachments.length > 1 ? 's' : ''} jointe{email.attachments.length > 1 ? 's' : ''}
                              </span>
                            </div>
                            <div className="attachment-grid">
                              {email.attachments.map((attachment, idx) => (
                                <div className="attachment-card" key={idx}>
                                  <div className="attachment-icon">
                                    <Paperclip size={20} />
                                  </div>
                                  <div className="attachment-info">
                                    <div className="attachment-name" onClick={() => handlePreviewAttachment(attachment)}>{attachment.name}</div>
                                    <div className="attachment-size">
                                      {formatFileSize(attachment.size)}
                                    </div>
                                  </div>
                                 <a 
                                      href="#"
                                      onClick={(e) => {
                                        e.preventDefault(); // Empêche le comportement par défaut du lien
                                        downloadAttachment(attachment);
                                      }}
                                      className="download-btn"
                                      title="Télécharger"
                                    >
                                      <Download size={16} />
                                    </a>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        {previewAttachment && (
  <div className="attachment-preview-modal">
    <button onClick={() => setPreviewAttachment(null)}>Fermer</button>

    {previewAttachment.type.startsWith('image') ? (
      <img src={previewAttachment.blobUrl} alt={previewAttachment.name} style={{ maxWidth: '100%' }} />
    ) : previewAttachment.type === 'application/pdf' ? (
      <iframe
        src={previewAttachment.blobUrl}
        style={{ width: '100%', height: '500px' }}
        title="PDF Preview"
      />
    ) : (
      <p>Prévisualisation non disponible pour ce type de fichier.</p>
    )}
  </div>
)}

                        
                        {/* Séparateur entre les emails */}
                        {index < threadEmails.length - 1 && <div className="email-separator"></div>}
                      </div>
                    ))}
                  </div>
                  
                  {/* Section de réponse */}
                <div className="reply-section-full">
  {isReplying ? (
    <div className="reply-form-full">
      <div className="reply-header">
        <h3>
          {replyType === 'forward' ? 'Transférer' : 
           replyType === 'replyAll' ? 'Répondre à tous' : 'Répondre'}
          {replyType !== 'forward' && ` à ${threadEmails[threadEmails.length - 1].sender.name || threadEmails[threadEmails.length - 1].sender.email}`}
        </h3>
      </div>
      
      {/* Champs de destinataires pour le transfert */}
      {replyType === 'forward' && (
        <div className="reply-recipients">
          <div className="form-field">
            <label>À:</label>
            <input 
              type="text" 
              value={replyRecipients.to.map(r => `${r.name ? r.name + ' <' + r.email + '>' : r.email}`).join(', ')}
              onChange={(e) => {
                const emails = e.target.value.split(',').map(email => {
                  const trimmed = email.trim();
                  if (!trimmed) return null;
                  const emailMatch = trimmed.match(/<(.+)>/);
                  const nameMatch = trimmed.match(/(.+)</);
                  const [emailAddr, name] = trimmed.includes('<')
                    ? [emailMatch ? emailMatch[1] : trimmed, nameMatch ? nameMatch[1].trim() : '']
                    : [trimmed, ''];
                  return { email: emailAddr, name };
                }).filter(Boolean);
                setReplyRecipients({...replyRecipients, to: emails});
              }}
              placeholder="destinataire@exemple.com"
            />
          </div>
          
          <div className="form-field">
            <label>Cc:</label>
            <input 
              type="text"
              value={replyRecipients.cc.map(r => `${r.name ? r.name + ' <' + r.email + '>' : r.email}`).join(', ')}
              onChange={(e) => {
                const emails = e.target.value.split(',').map(email => {
                  const trimmed = email.trim();
                  if (!trimmed) return null;
                  const emailMatch = trimmed.match(/<(.+)>/);
                  const nameMatch = trimmed.match(/(.+)</);
                  const [emailAddr, name] = trimmed.includes('<')
                    ? [emailMatch ? emailMatch[1] : trimmed, nameMatch ? nameMatch[1].trim() : '']
                    : [trimmed, ''];
                  return { email: emailAddr, name };
                }).filter(Boolean);
                setReplyRecipients({...replyRecipients, cc: emails});
              }}
              placeholder="cc@exemple.com"
            />
          </div>
        </div>
      )}
      
      {/* Affichage des destinataires pour reply/replyAll */}
      {replyType !== 'forward' && (
        <div className="reply-recipients-display">
          <div className="recipient-info">
            <strong>À:</strong> {replyRecipients.to.map(r => r.name || r.email).join(', ')}
          </div>
          {replyRecipients.cc.length > 0 && (
            <div className="recipient-info">
              <strong>Cc:</strong> {replyRecipients.cc.map(r => r.name || r.email).join(', ')}
            </div>
          )}
        </div>
      )}
      
      <div className="reply-content">
        <textarea 
          className="reply-textarea"
          value={replyContent}
          onChange={(e) => setReplyContent(e.target.value)}
          placeholder={
            replyType === 'forward' ? 
            "Ajoutez votre message avant de transférer..." :
            "Écrivez votre réponse ici..."
          }
          rows="8"
        />
      </div>
      
      {/* Gestion des pièces jointes pour la réponse */}
      <div className="reply-attachments">
        <div className="attachment-controls">
          <input 
            type="file" 
            multiple
            onChange={(e) => {
              if (e.target.files) {
                Array.from(e.target.files).forEach(file => {
                  addReplyAttachment(file);
                });
              }
            }}
            style={{ display: 'none' }}
            id="reply-file-input"
          />
          <label htmlFor="reply-file-input" className="attachment-btn">
            <Paperclip size={16} />
            Joindre des fichiers
          </label>
        </div>
        
        {replyAttachments.length > 0 && (
          <div className="attachment-list">
            <h4>Pièces jointes ({replyAttachments.length})</h4>
            {replyAttachments.map((attachment, idx) => (
              <div className="attachment-item" key={idx}>
                <div className="attachment-info">
                  <div className="attachment-name">{attachment.name}</div>
                  <div className="attachment-size">{formatFileSize(attachment.size)}</div>
                </div>
                <button 
                  className="remove-attachment"
                  onClick={() => removeReplyAttachment(idx)}
                  title="Supprimer la pièce jointe"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <div className="reply-actions-full">
        <button 
          className="btn-primary send-reply-btn"
          onClick={sendReply}
          disabled={!replyContent.trim() || (replyType === 'forward' && replyRecipients.to.length === 0)}
        >
          {replyType === 'forward' ? (
            <>
              <Forward size={16} />
              Transférer
            </>
          ) : replyType === 'replyAll' ? (
            <>
              <ReplyAll size={16} />
              Répondre à tous
            </>
          ) : (
            <>
              <Reply size={16} />
              Répondre
            </>
          )}
        </button>
        <button 
          className="btn-secondary cancel-reply-btn"
          onClick={() => {
            setIsReplying(false);
            setReplyContent('');
            setReplyAttachments([]);
            setReplyRecipients({ to: [], cc: [], bcc: [] });
            setReplyType('reply');
          }}
        >
          Annuler
        </button>
      </div>
    </div>
  ) : null }
</div>
                </>
              ) : (
                <div className="empty-state-full">
                  <p>Aucun email trouvé dans cette conversation</p>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
  

      {/* Compose Email Modal */}
      {isComposing && (
        <div className="modal-overlay">
          <div className="compose-modal">
            <div className="modal-header">
              <h3>Nouveau Message</h3>
              <button className="close-button" onClick={() => setIsComposing(false)}>×</button>
            </div>
            
            <div className="compose-form">
              <div className="form-field">
                <label>À:</label>
                <input 
                  type="text" 
                  value={newEmail.to.join(', ')}
                  onChange={(e) => setNewEmail({
                    ...newEmail,
                    to: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                  })}
                  placeholder="destinataire@exemple.com"
                />
              </div>
              
              <div className="form-field">
                <label>Cc:</label>
                <input 
                  type="text"
                  value={newEmail.cc.join(', ')}
                  onChange={(e) => setNewEmail({
                    ...newEmail,
                    cc: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                  })}
                  placeholder="cc@exemple.com"
                />
              </div>
              
              <div className="form-field">
                <label>Bcc:</label>
                <input 
                  type="text"
                  value={newEmail.bcc.join(', ')}
                  onChange={(e) => setNewEmail({
                    ...newEmail,
                    bcc: e.target.value.split(',').map(email => email.trim()).filter(Boolean)
                  })}
                  placeholder="bcc@exemple.com"
                />
              </div>
              
              <div className="form-field">
                <label>Sujet:</label>
                <input 
                  type="text"
                  value={newEmail.subject}
                  onChange={(e) => setNewEmail({
                    ...newEmail,
                    subject: e.target.value
                  })}
                  placeholder="Objet de l'email"
                />
              </div>
              
              <div className="form-field message-field">
                <label>Message:</label>
                <textarea 
                  value={newEmail.body}
                  onChange={(e) => setNewEmail({
                    ...newEmail,
                    body: e.target.value
                  })}
                  placeholder="Contenu de votre message..."
                />
              </div>
              
                                  <div className="attachment-list-header">
                                    <label>Pièces jointes ({newEmail.attachments.length})</label>
                                    <label className="attachment-upload-btn">
                                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                                      </svg>
                                      <input 
                                        type="file" 
                                        multiple 
                                        hidden 
                                        onChange={(e) => e.target.files && Array.from(e.target.files).forEach(addAttachment)} 
                                      />
                                    </label>
                                    </div>

                                    {newEmail.attachments.length > 0 && (
                                    <div className="attachment-list">
                                      {newEmail.attachments.map((attachment, idx) => (
                                        <div className="attachment-item" key={idx}>
                                          <div className="attachment-name">{attachment.name}</div>
                                          <div className="attachment-size">{formatFileSize(attachment.size)}</div>
                                          <button 
                                            className="remove-attachment"
                                            onClick={() => removeAttachment(idx)}
                                            title="Supprimer"
                                          >
                                            ×
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}

              
              <div className="form-actions">
                <button 
                  className="send-button"
                  onClick={sendNewEmail}
                  disabled={!newEmail.subject.trim() || !newEmail.body.trim() || newEmail.to.length === 0}
                >
                  Envoyer
                </button>
                <button 
                  className="save-draft-button"
                 onClick={() => saveDraft()}>
                  Sauvegarder comme brouillon
                </button>
                <button 
                  className="cancel-button"
                  onClick={() => setIsComposing(false)}
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification */}
      {notification && (
        <div className={`notification ${notification.type}`}>
          {notification.message}
        </div>
      )}

      {selectedDraft && (
  <DraftModal
    draft={selectedDraft}
    onClose={() => setSelectedDraft(null)}
    onSend={handleSendDraft}
    onSave={handleSaveDraftFromModal}
    onDelete={handleDeleteDraftFromModal}
  />
)}
    </div>
  );
};

export default EmailApp;

