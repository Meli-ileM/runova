

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './profile.css';
import CryptoService from '../../utils/cryptoService'; // Assurez-vous d'importer CryptoService

import { 
  FaTrash, 
  FaEdit, 
  FaKey, 
  FaSignOutAlt, 
  FaUser, 
  FaEnvelope, 
  FaCalendarAlt,
  FaCheckCircle,
  FaUserClock,
  FaSyncAlt,
  FaCircle,
  FaCamera,
  FaUpload,
  FaTimes,
  FaArrowLeft
} from 'react-icons/fa';

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('edit');
  const [formData, setFormData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  
  // États pour la gestion de la photo de profil
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);

  const navigate = useNavigate();

  // Options de statut disponibles
  const statusOptions = [
    { value: 'active', label: 'Actif', color: '#28a745' },
    { value: 'away', label: 'Absent', color: '#ffc107' },
    { value: 'busy', label: 'Occupé', color: '#dc3545' },
    { value: 'offline', label: 'Hors ligne', color: '#6c757d' }
  ];

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch('https://runova.onrender.com/api/auth/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Erreur serveur');
        }

        if (!result.data || !result.data.user) {
          throw new Error('Structure de données incorrecte');
        }

        setUserData(result.data.user);
        setFormData({
          firstName: result.data.user.firstName,
          lastName: result.data.user.lastName,
          email: result.data.user.email,
          birthDate: result.data.user.birthDate?.split('T')[0] || '',
          presenceStatus: result.data.user.presenceStatus || result.data.user.status || 'active',
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } catch (err) {
        console.error('Erreur détaillée:', err);
        setError(err.message);
        handleLogout();
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Validation avancée des fichiers
  const validateFile = (file) => {
    const errors = [];
    
    // Types de fichiers autorisés
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      errors.push('Seuls les fichiers JPG, PNG, GIF et WebP sont autorisés');
    }

    // Taille maximale (5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB en bytes
    if (file.size > maxSize) {
      errors.push(`La taille du fichier ne doit pas dépasser ${(maxSize / 1024 / 1024).toFixed(1)}MB`);
    }

    // Taille minimale (1KB pour éviter les fichiers corrompus)
    const minSize = 1024; // 1KB
    if (file.size < minSize) {
      errors.push('Le fichier semble être corrompu ou trop petit');
    }

    return errors;
  };

  // Gestion de la sélection de photo avec validation renforcée
  const handlePhotoSelect = (e) => {
    const file = e.target.files[0];
    
    // Reset l'input pour permettre de sélectionner le même fichier
    e.target.value = '';
    
    if (!file) return;

    // Validation du fichier
    const validationErrors = validateFile(file);
    if (validationErrors.length > 0) {
      alert(validationErrors.join('\n'));
      return;
    }

    setSelectedPhoto(file);
    
    // Créer une prévisualisation
    const reader = new FileReader();
    reader.onload = (event) => {
      setPhotoPreview(event.target.result);
      setShowPhotoModal(true);
    };
    
    reader.onerror = () => {
      alert('Erreur lors de la lecture du fichier');
    };
    
    reader.readAsDataURL(file);
  };

  // Upload de la photo de profil avec gestion d'erreurs améliorée
  const handlePhotoUpload = async () => {
    if (!selectedPhoto) {
      alert('Aucun fichier sélectionné');
      return;
    }

    setPhotoUploading(true);
    
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      // Créer FormData avec le bon nom de champ attendu par le serveur
      const formDataPhoto = new FormData();
      formDataPhoto.append('profile_photo', selectedPhoto, selectedPhoto.name);

      console.log('Upload en cours...', {
        fileName: selectedPhoto.name,
        fileSize: selectedPhoto.size,
        fileType: selectedPhoto.type,
        fieldName: 'profile_photo'
      });

      const response = await fetch('https://runova.onrender.com/api/auth/editprofile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          // ⚠️ IMPORTANT: Ne pas définir Content-Type pour FormData
          // Le navigateur le définit automatiquement avec boundary
        },
        body: formDataPhoto
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `Erreur HTTP ${response.status}: ${response.statusText}`);
      }

      // Vérifier la structure de la réponse
      if (!result.data || !result.data.user) {
        throw new Error('Réponse serveur invalide');
      }

      // Mettre à jour les données utilisateur
      setUserData(result.data.user);
      
      // Fermer le modal et nettoyer les états
      handlePhotoCancelation();
      
      alert('Photo de profil mise à jour avec succès');
      
    } catch (err) {
      console.error('Erreur upload photo:', err);
      
      // Messages d'erreur spécifiques
      let errorMessage = 'Erreur lors de l\'upload de la photo';
      
      if (err.message.includes('Unexpected field')) {
        errorMessage = 'Configuration serveur incorrecte pour l\'upload de fichiers';
      } else if (err.message.includes('413') || err.message.includes('too large')) {
        errorMessage = 'Le fichier est trop volumineux (max 5MB)';
      } else if (err.message.includes('401')) {
        errorMessage = 'Session expirée, veuillez vous reconnecter';
        handleLogout();
        return;
      } else if (err.message.includes('400')) {
        errorMessage = err.message || 'Format de fichier non supporté';
      } else if (err.message.includes('500')) {
        errorMessage = 'Erreur serveur, veuillez réessayer plus tard';
      } else if (err.message.includes('Seuls les fichiers image')) {
        errorMessage = 'Seuls les fichiers image sont autorisés';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      alert(errorMessage);
    } finally {
      setPhotoUploading(false);
    }
  };

  // Annuler la sélection de photo
  const handlePhotoCancelation = () => {
    setShowPhotoModal(false);
    setSelectedPhoto(null);
    setPhotoPreview(null);
    
    // Reset l'input file
    const fileInput = document.getElementById('photo-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');

      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      const response = await fetch('https://runova.onrender.com/api/auth/editprofile', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          birthDate: formData.birthDate,
          presenceStatus: formData.presenceStatus
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la mise à jour');
      }

      if (result.data && result.data.user) {
        setUserData(result.data.user);
      }
      
      alert('Profil mis à jour avec succès');
    } catch (err) {
      console.error('Erreur:', err);
      setError(err.message);
    }
  };

// // Fonction corrigée pour le changement de mot de passe avec rechiffrement de la clé privée
// const handlePasswordChange = async (e) => {
//   e.preventDefault();
//   setError(''); // Reset les erreurs précédentes
//   setPasswordLoading(true); // Indicateur de chargement
  
//   try {
//     // Validation côté client
//     if (formData.newPassword !== formData.confirmPassword) {
//       throw new Error('Les nouveaux mots de passe ne correspondent pas');
//     }
    
//     if (formData.newPassword.length < 6) {
//       throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
//     }

//     if (!formData.currentPassword) {
//       throw new Error('Le mot de passe actuel est requis');
//     }
    
//     const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
//     if (!token) {
//       throw new Error('Token d\'authentification manquant');
//     }

//     let newEncryptedPrivateKey = null;

//     // Étape 1: Vérifier si l'utilisateur a une clé privée et la rechiffrer si nécessaire
//     try {
//       console.log('Vérification de l\'existence de la clé privée...');
//       const checkKeyResponse = await fetch(`https://runova.onrender.com/api/auth/check-private-key?email=${encodeURIComponent(userData.email)}`, {
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       });

//       if (checkKeyResponse.ok) {
//         const checkKeyResult = await checkKeyResponse.json();
        
//         if (checkKeyResult.hasPrivateKey) {
//           console.log('Clé privée détectée, début du rechiffrement...');
          
//           // Récupérer la clé privée chiffrée actuelle
//           const getKeyResponse = await fetch(`https://runova.onrender.com/api/auth/get-private-key?email=${encodeURIComponent(userData.email)}`, {
//             headers: {
//               'Authorization': `Bearer ${token}`
//             }
//           });

//           if (getKeyResponse.ok) {
//             const getKeyResult = await getKeyResponse.json();
            
//             // Rechiffrer la clé privée avec le nouveau mot de passe
//             newEncryptedPrivateKey = await CryptoService.reEncryptPrivateKey(
//               getKeyResult.encryptedPrivateKey,
//               formData.currentPassword,
//               formData.newPassword
//             );
            
//             console.log('Rechiffrement de la clé privée réussi');
//           } else {
//             console.warn('Impossible de récupérer la clé privée pour le rechiffrement');
//           }
//         } else {
//           console.log('Aucune clé privée à rechiffrer');
//         }
//       } else {
//         console.warn('Erreur lors de la vérification de la clé privée');
//       }
//     } catch (cryptoError) {
//       console.error('Erreur lors du rechiffrement:', cryptoError);
      
//       // Si le rechiffrement échoue, c'est probablement que le mot de passe actuel est incorrect
//       if (cryptoError.message.includes('Mot de passe incorrect') || 
//           cryptoError.message.includes('clé privée corrompue')) {
//         throw new Error('Mot de passe actuel incorrect');
//       } else {
//         throw new Error('Erreur lors du rechiffrement de la clé privée: ' + cryptoError.message);
//       }
//     }

//     // Étape 2: Envoyer la demande de changement de mot de passe au serveur
//     console.log('Envoi de la demande de changement de mot de passe...');
//     const requestBody = {
//       currentPassword: formData.currentPassword,
//       newPassword: formData.newPassword
//     };

//     // Ajouter la nouvelle clé chiffrée si elle a été générée
//     if (newEncryptedPrivateKey) {
//       requestBody.newEncryptedPrivateKey = newEncryptedPrivateKey;
//     }

//     const response = await fetch('https://runova.onrender.com/api/auth/password', {
//       method: 'PATCH',
//       headers: {
//         'Authorization': `Bearer ${token}`,
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify(requestBody)
//     });

//     const result = await response.json();

//     if (!response.ok) {
//       throw new Error(result.message || 'Erreur lors du changement de mot de passe');
//     }

//     // Succès
//     console.log('Mot de passe changé avec succès');
    
//     // Message de succès détaillé
//     let successMessage = 'Mot de passe mis à jour avec succès';
//     if (newEncryptedPrivateKey) {
//       successMessage += '\nVotre clé privée a été rechiffrée avec le nouveau mot de passe.';
//     }
    
//     alert(successMessage);
    
//     // Reset du formulaire
//     setFormData(prev => ({
//       ...prev,
//       currentPassword: '',
//       newPassword: '',
//       confirmPassword: ''
//     }));

//   } catch (err) {
//     console.error('Erreur lors du changement de mot de passe:', err);
//     setError(err.message);
//   } finally {
//     setPasswordLoading(false); // Arrêter l'indicateur de chargement
//   }
// };

// Processus complet et sécurisé de changement de mot de passe
// avec rechiffrement automatique de la clé privée

const handlePasswordChange = async (e) => {
  e.preventDefault();
  setError('');
  setPasswordLoading(true);
  
  try {
    // === PHASE 1: VALIDATIONS INITIALES ===
    console.log('🔍 Phase 1: Validations initiales');
    
    // Validation des champs
    if (!formData.currentPassword) {
      throw new Error('Le mot de passe actuel est requis');
    }
    
    if (!formData.newPassword) {
      throw new Error('Le nouveau mot de passe est requis');
    }
    
    if (formData.newPassword.length < 6) {
      throw new Error('Le nouveau mot de passe doit contenir au moins 6 caractères');
    }
    
    if (formData.newPassword !== formData.confirmPassword) {
      throw new Error('Les nouveaux mots de passe ne correspondent pas');
    }
    
    // Validation du token d'authentification
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      throw new Error('Token d\'authentification manquant');
    }
    
    console.log('✅ Validations initiales réussies');
    
    // === PHASE 2: GESTION DE LA CLÉ PRIVÉE ===
    console.log('🔐 Phase 2: Gestion de la clé privée');
    
    let newEncryptedPrivateKey = null;
    let hasPrivateKey = false;
    
    try {
      // Vérifier si l'utilisateur a une clé privée
      console.log('Vérification de l\'existence de la clé privée...');
      const checkKeyResponse = await fetch(
        `https://runova.onrender.com/api/auth/check-private-key?email=${encodeURIComponent(userData.email)}`, 
        {
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );

      if (checkKeyResponse.ok) {
        const checkKeyResult = await checkKeyResponse.json();
        hasPrivateKey = checkKeyResult.hasPrivateKey;
        
        if (hasPrivateKey) {
          console.log('🔑 Clé privée détectée, récupération pour rechiffrement...');
          
          // Récupérer la clé privée chiffrée actuelle
          const getKeyResponse = await fetch(
            `https://runova.onrender.com/api/auth/get-private-key?email=${encodeURIComponent(userData.email)}`, 
            {
              headers: { 'Authorization': `Bearer ${token}` }
            }
          );

          if (!getKeyResponse.ok) {
            throw new Error('Impossible de récupérer la clé privée existante');
          }
          
          const getKeyResult = await getKeyResponse.json();
          
          if (!getKeyResult.encryptedPrivateKey) {
            throw new Error('Clé privée non trouvée dans la réponse serveur');
          }
          
          console.log('🔄 Début du rechiffrement de la clé privée...');
          
          // Rechiffrer la clé privée avec le nouveau mot de passe
          newEncryptedPrivateKey = await CryptoService.reEncryptPrivateKey(
            getKeyResult.encryptedPrivateKey,
            formData.currentPassword,
            formData.newPassword
          );
          
          console.log('✅ Rechiffrement de la clé privée réussi');
        } else {
          console.log('ℹ️ Aucune clé privée à rechiffrer');
        }
      } else {
        console.warn('⚠️ Erreur lors de la vérification de la clé privée, continuons sans rechiffrement');
      }
    } catch (cryptoError) {
      console.error('❌ Erreur lors de la gestion de la clé privée:', cryptoError);
      
      // Gestion des erreurs spécifiques du chiffrement
      if (cryptoError.message.includes('Mot de passe incorrect') || 
          cryptoError.message.includes('clé privée corrompue')) {
        throw new Error('Mot de passe actuel incorrect - impossible de déchiffrer votre clé privée');
      } else if (cryptoError.message.includes('Impossible de récupérer')) {
        throw new Error('Erreur technique lors de la récupération de votre clé privée');
      } else {
        throw new Error(`Erreur lors du rechiffrement: ${cryptoError.message}`);
      }
    }
    
    // === PHASE 3: CHANGEMENT DE MOT DE PASSE SERVEUR ===
    console.log('🌐 Phase 3: Mise à jour du mot de passe sur le serveur');
    
    // Préparer les données pour le serveur
    const requestBody = {
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword
    };

    // Inclure la nouvelle clé chiffrée si elle existe
    if (newEncryptedPrivateKey) {
      requestBody.newEncryptedPrivateKey = newEncryptedPrivateKey;
      console.log('📦 Nouvelle clé privée chiffrée incluse dans la requête');
    }

    // Envoyer la demande au serveur
    const response = await fetch('https://runova.onrender.com/api/auth/password', {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    const result = await response.json();

    if (!response.ok) {
      // Gestion des erreurs serveur spécifiques
      if (response.status === 401) {
        throw new Error('Mot de passe actuel incorrect');
      } else if (response.status === 400) {
        throw new Error(result.message || 'Données invalides');
      } else if (response.status === 500) {
        throw new Error('Erreur serveur lors de la mise à jour');
      } else {
        throw new Error(result.message || 'Erreur lors du changement de mot de passe');
      }
    }

    // === PHASE 4: FINALISATION ===
    console.log('🎉 Phase 4: Finalisation');
    
    // Préparer le message de succès
    let successMessage = '✅ Mot de passe mis à jour avec succès';
    if (hasPrivateKey && newEncryptedPrivateKey) {
      successMessage += '\n🔐 Votre clé privée a été automatiquement rechiffrée avec le nouveau mot de passe.';
      successMessage += '\n🔒 Vos messages chiffrés restent accessibles.';
    }
    
    console.log('✅ Changement de mot de passe terminé avec succès');
    alert(successMessage);
    
    // Reset du formulaire
    setFormData(prev => ({
      ...prev,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    }));

  } catch (err) {
    console.error('❌ Erreur lors du changement de mot de passe:', err);
    
    // Formatage de l'erreur pour l'utilisateur
    let userMessage = err.message;
    
    // Ajouter des conseils selon le type d'erreur
    if (err.message.includes('Mot de passe actuel incorrect')) {
      userMessage += '\n\n💡 Conseil: Vérifiez que vous saisissez correctement votre mot de passe actuel.';
    } else if (err.message.includes('rechiffrement')) {
      userMessage += '\n\n⚠️ Important: Votre mot de passe n\'a pas été modifié pour préserver la sécurité de vos données chiffrées.';
    } else if (err.message.includes('serveur')) {
      userMessage += '\n\n🔄 Conseil: Veuillez réessayer dans quelques instants.';
    }
    
    setError(userMessage);
  } finally {
    setPasswordLoading(false);
  }
};

// Fonction utilitaire pour vérifier la force du mot de passe
const checkPasswordStrength = (password) => {
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
  };
  
  const score = Object.values(checks).filter(Boolean).length;
  
  return {
    score,
    strength: score < 2 ? 'Faible' : score < 4 ? 'Moyen' : 'Fort',
    checks
  };
};

// Fonction utilitaire pour la validation en temps réel
const validatePasswordForm = (formData) => {
  const errors = [];
  
  if (!formData.currentPassword) {
    errors.push('Le mot de passe actuel est requis');
  }
  
  if (!formData.newPassword) {
    errors.push('Le nouveau mot de passe est requis');
  } else {
    if (formData.newPassword.length < 6) {
      errors.push('Le nouveau mot de passe doit contenir au moins 6 caractères');
    }
    
    if (formData.currentPassword === formData.newPassword) {
      errors.push('Le nouveau mot de passe doit être différent de l\'actuel');
    }
  }
  
  if (formData.newPassword && formData.confirmPassword) {
    if (formData.newPassword !== formData.confirmPassword) {
      errors.push('Les nouveaux mots de passe ne correspondent pas');
    }
  }
  
  return errors;
};
  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteError('');
    
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch('https://runova.onrender.com/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: deletePassword
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Erreur lors de la suppression du compte');
      }

      handleLogout();
      alert('Votre compte a été supprimé avec succès');
    } catch (err) {
      console.error('Erreur lors de la suppression du compte:', err);
      setDeleteError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('userData');
    navigate('/login');
  };

  const getStatusInfo = (presenceStatus) => {
    return statusOptions.find(option => option.value === presenceStatus) || statusOptions[0];
  };

  // Fonction pour obtenir l'URL de la photo de profil
  const getProfilePhotoUrl = (profilePhoto) => {
    if (!profilePhoto) {
      return '/default-avatar.jpg';
    }
    
    // Si c'est déjà une URL complète
    if (profilePhoto.startsWith('http')) {
      return profilePhoto;
    }
    
    // Sinon, construire l'URL
    return `https://runova.onrender.com/uploads/profiles/${profilePhoto}`;
  };

  if (loading) return <div className="loading">Chargement en cours...</div>;
  if (error) return <div className="error">Erreur: {error}</div>;

  return (
    <div className="profile-container">
    
      {userData && (
        <div className="profile-card">
         <button className="back-button-small" onClick={() => navigate('/index')}>
        <FaArrowLeft />
      </button>
          <div className="profile-sidebar">
            <div className="profile-photo-container">
              <img
                src={getProfilePhotoUrl(userData.profilePhoto)}
                alt="Photo de profil"
                className="profile-photo"
                onError={(e) => {
                  e.target.src = '/default-avatar.jpg';
                }}
              />
              <div className="photo-overlay">
                <label htmlFor="photo-upload" className="photo-upload-btn">
                  <FaCamera />
                  <span>Changer</span>
                </label>
                <input
                  id="photo-upload"
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                  onChange={handlePhotoSelect}
                  style={{ display: 'none' }}
                />
              </div>
            </div>
            
            <div className="profile-info">
              <h2 className="profile-name">{userData.firstName} {userData.lastName}</h2>
              <p className="profile-email"><FaEnvelope /> {userData.email}</p>
              
              <div className="info-item">
                {userData.birthDate && (
                  <p className="profile-meta">
                    <FaCalendarAlt /> Naissance: {new Date(userData.birthDate).toLocaleDateString()}
                  </p>
                )}
              </div>
              
              <div className="info-item">
                <span className="info-label"><FaCheckCircle /> Statut:</span>
                <span 
                  style={{ color: getStatusInfo(userData.presenceStatus || userData.status || 'active').color }}
                >
                  <FaCircle size={8} style={{ marginRight: '8px' }} />
                  {getStatusInfo(userData.presenceStatus || userData.status || 'active').label}
                </span>
              </div>
              
              <div className="info-item">
                <span className="info-label"><FaUserClock /> Membre depuis:</span>
                <span className="info-value">{new Date(userData.createdAt).toLocaleDateString()}</span>
              </div>
                
              <button className="btn-logout" onClick={handleLogout}>
                <FaSignOutAlt /> Déconnexion
              </button>
            </div>
          </div>
          
          <div className="profile-content">
            <div className="profile-tabs">
              <button 
                className={`tab-button ${activeTab === 'edit' ? 'active' : ''}`}
                onClick={() => setActiveTab('edit')}
              >
                Modifier le profil
              </button>
              <button 
                className={`tab-button ${activeTab === 'password' ? 'active' : ''}`}
                onClick={() => setActiveTab('password')}
              >
                Changer le mot de passe
              </button>
            </div>
            
            <div className={`tab-content ${activeTab === 'edit' ? 'active' : ''}`}>
              <form onSubmit={handleSubmit} className="edit-form">
                <div className="form-group">
                  <label><FaUser /> Prénom</label>
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label><FaUser /> Nom</label>
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName || ''}
                    onChange={handleInputChange}
                  />
                </div>
                
                <div className="form-group">
                  <label><FaEnvelope /> Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email || ''}
                    onChange={handleInputChange}
                    disabled
                  />
                </div>
                
                <div className="form-group">
                  <label><FaCalendarAlt /> Date de naissance</label>
                  <input
                    type="date"
                    name="birthDate"
                    value={formData.birthDate || ''}
                    onChange={handleInputChange}
                  />
                </div>

                <div className="form-group">
                  <label><FaCircle /> Statut</label>
                  <select
                    name="presenceStatus"
                    value={formData.presenceStatus || 'active'}
                    onChange={handleInputChange}
                    className="status-select"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="update-info">
                  <span className="info-value">
                    <FaSyncAlt /> Dernière mise à jour: {new Date(userData.updatedAt).toLocaleString()}
                  </span>
                </div>
                
                <div className="form-actions-profile">
                  <button className="btn-delete-profile" type="button" onClick={() => setShowDeleteConfirm(true)}>
                    <FaTrash /> Supprimer mon compte
                  </button>
                  <button type="button" className="btn-secondary-profile">
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary-profile">
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>
<div className={`tab-content ${activeTab === 'password' ? 'active' : ''}`}>
  <form onSubmit={handlePasswordChange} className="password-form">
    <div className="form-group">
      <label><FaKey /> Mot de passe actuel</label>
      <input
        type="password"
        name="currentPassword"
        value={formData.currentPassword || ''}
        onChange={handleInputChange}
        placeholder="••••••••"
        required
        disabled={passwordLoading}
      />
    </div>
    
    <div className="form-group">
      <label><FaKey /> Nouveau mot de passe</label>
      <input
        type="password"
        name="newPassword"
        value={formData.newPassword || ''}
        onChange={handleInputChange}
        placeholder="••••••••"
        minLength="6"
        required
        disabled={passwordLoading}
      />
    </div>
    
    <div className="form-group">
      <label><FaKey /> Confirmer le nouveau mot de passe</label>
      <input
        type="password"
        name="confirmPassword"
        value={formData.confirmPassword || ''}
        onChange={handleInputChange}
        placeholder="••••••••"
        minLength="6"
        required
        disabled={passwordLoading}
      />
    </div>
    
    {/* Affichage des erreurs */}
    {error && (
      <div className="error-message" style={{ 
        color: 'red', 
        marginBottom: '10px', 
        padding: '10px', 
        backgroundColor: '#ffebee', 
        border: '1px solid #ffcdd2', 
        borderRadius: '4px' 
      }}>
        {error}
      </div>
    )}
    
    <div className="update-info-password">
      <span className="info-label"><FaSyncAlt /> Dernière mise à jour:</span>
      <span className="info-value">{new Date(userData.updatedAt).toLocaleString()}</span>
    </div>
    
    <div className="form-actions">
      <button 
        type="button" 
        className="btn-secondary-profile"
        disabled={passwordLoading}
        onClick={() => {
          setFormData(prev => ({
            ...prev,
            currentPassword: '',
            newPassword: '',
            confirmPassword: ''
          }));
          setError('');
        }}
      >
        Annuler
      </button>
      <button 
        type="submit" 
        className="btn-primary-profile"
        disabled={passwordLoading}
      >
        {passwordLoading ? (
          <>
            <FaSyncAlt className="spinning" /> Traitement en cours...
          </>
        ) : (
          <>
            <FaKey /> Enregistrer
          </>
        )}
      </button>
    </div>
  </form>
</div> 
            {/* <div className={`tab-content ${activeTab === 'password' ? 'active' : ''}`}>
              <form onSubmit={handlePasswordChange} className="password-form">
                <div className="form-group">
                  <label><FaKey /> Mot de passe actuel</label>
                  <input
                    type="password"
                    name="currentPassword"
                    value={formData.currentPassword || ''}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label><FaKey /> Nouveau mot de passe</label>
                  <input
                    type="password"
                    name="newPassword"
                    value={formData.newPassword || ''}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    minLength="6"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label><FaKey /> Confirmer le nouveau mot de passe</label>
                  <input
                    type="password"
                    name="confirmPassword"
                    value={formData.confirmPassword || ''}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    minLength="6"
                    required
                  />
                </div>
                
                <div className="update-info-password">
                  <span className="info-label"><FaSyncAlt /> Dernière mise à jour:</span>
                  <span className="info-value">{new Date(userData.updatedAt).toLocaleString()}</span>
                </div>
                
                <div className="form-actions">
                  <button type="button" className="btn-secondary">
                    Annuler
                  </button>
                  <button type="submit" className="btn-primary">
                    Enregistrer
                  </button>
                </div>
              </form>
            </div> */}
          </div>
        </div>
      )}
      
      {/* Modal de confirmation de photo */}
      {showPhotoModal && (
        <div className="modal-overlay">
          <div className="modal-content photo-modal">
            <h2><FaUpload /> Nouvelle photo de profil</h2>
            
            <div className="photo-preview">
              <img 
                src={photoPreview} 
                alt="Aperçu de la nouvelle photo" 
                className="preview-image"
              />
            </div>
            
            <div className="photo-info">
              <p><strong>Fichier:</strong> {selectedPhoto?.name}</p>
              <p><strong>Taille:</strong> {selectedPhoto ? (selectedPhoto.size / 1024 / 1024).toFixed(2) : '0'} MB</p>
              <p><strong>Type:</strong> {selectedPhoto?.type}</p>
            </div>
            
            <div className="modal-actions">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={handlePhotoCancelation}
                disabled={photoUploading}
              >
                <FaTimes /> Annuler
              </button>
              <button 
                type="button" 
                className="btn-primary"
                onClick={handlePhotoUpload}
                disabled={photoUploading}
              >
                {photoUploading ? (
                  <>
                    <FaSyncAlt className="spinning" /> Upload en cours...
                  </>
                ) : (
                  <>
                    <FaUpload /> Confirmer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de suppression de compte */}
      {showDeleteConfirm && (
        <div className="modal-overlay">
          <div className="modal-content delete-modal">
            <h2><FaTrash /> Supprimer votre compte</h2>
            <p className="warning-text">
              Attention ! Cette action est irréversible et supprimera définitivement votre compte ainsi que toutes vos données.
            </p>
            
            <form onSubmit={handleDeleteAccount} className="delete-form">
              <div className="form-group">
                <label><FaKey /> Confirmez votre mot de passe pour continuer</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Mot de passe"
                  required
                />
              </div>
              
              {deleteError && <p className="error-message">{deleteError}</p>}
              
              <div className="modal-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletePassword('');
                    setDeleteError('');
                  }}
                >
                  Annuler
                </button>
                <button type="submit" className="btn-danger">
                  <FaTrash /> Supprimer définitivement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
