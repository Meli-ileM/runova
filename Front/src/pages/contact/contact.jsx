import React, { useState, useEffect, useRef,useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './contact.css';
import { FiSearch, FiPlus, FiMail, FiPhone, FiMoreVertical, FiEdit2, FiTrash2 } from 'react-icons/fi';
const API_BASE_URL = 'https://runova.onrender.com/api';
import  {FaArrowLeft
} from 'react-icons/fa';

const Contacts = () => {
  const [contacts, setContacts] = useState([]);
  const [filteredContacts, setFilteredContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    labels: []
  });
  const [availableLabels, setAvailableLabels] = useState([]);
  const modalRef = useRef();
  const navigate = useNavigate();
  const [selectedLabel, setSelectedLabel] = useState(null);
  const [isComposing, setIsComposing] = useState(false);
    const [newEmail, setNewEmail] = useState({
    subject: '',
    body: '',
    to: [],
    cc: [],
    bcc: [],
    attachments: [],
    isDraft: false
  });
const fetchApi = useCallback(async (url, options = {}) => {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      navigate('/login');
      return { success: false };
    }
  
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options.headers || {})
    };
  
    try {
      const response = await fetch(`${API_BASE_URL}${url}`, {
        ...options,
        headers
      });
  
      // Gestion des réponses non-OK
      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('authToken');
          navigate('/login');
          return { success: false };
        }
        
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`);
      }
  
      return await response.json();
      
    } catch (error) {
      console.error('Erreur API:', error);
      
      return { 
        success: false,
        error: error.message 
      };
    }
  }, [navigate]);
  // État pour le modal d'ajout de label - CORRIGÉ : utilisez useState au lieu de React.useState
  const [isAddLabelOpen, setIsAddLabelOpen] = useState(false);
  const [newLabelName, setNewLabelName] = useState('');
  const [newLabelColor, setNewLabelColor] = useState('#081F5C'); // couleur par défaut comme dans GererLabel

  // Fonction pour ouvrir le modal d'ajout de label - CORRIGÉE pour être plus explicite
  const openAddLabelModal = () => {
    console.log("Ouverture du modal d'ajout de label");
    setIsAddLabelOpen(true);
  };
  

  // Fonction pour fermer le modal d'ajout de label
  const closeAddLabelModal = () => {
    setIsAddLabelOpen(false);
    setNewLabelName('');
    setNewLabelColor('#081F5C');
  };

  const handleAddLabelSubmit = async (e) => {
  e.preventDefault();
  
  if (!newLabelName.trim()) {
    toast.error("Le nom du label ne peut pas être vide");
    return;
  }

  const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
  if (!token) {
    toast.error('Non authentifié');
    return;
  }

  try {
    const response = await fetch('https://runova.onrender.com/api/labels', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: newLabelName.trim(),
        color: newLabelColor,
        type: 'contact', // Type fixé pour les contacts
        associatedEmails: [] // Initialisé vide
      })
    });

    const data = await response.json();
    
    console.log("Réponse API création label:", data); // Debug
    
    if (!response.ok) {
      throw new Error(data.message || 'Erreur API');
    }

    // Mise à jour optimiste de l'UI
    setAvailableLabels(prev => [...prev, data.data.label]);
    toast.success('Label créé avec succès');
    
    // Fermeture du modal
    closeAddLabelModal();
    
    // Sélection automatique si en mode édition
    if (isModalOpen) {
      handleLabelToggle(data.data.label._id);
    }

  } catch (error) {
    console.error("Erreur création label:", error);
    toast.error(error.message || 'Erreur lors de la création du label');
  }
};
  const handleLabelModalClick = (e) => {
    // Empêcher la propagation de l'événement pour que le modal de contact ne soit pas fermé
    e.stopPropagation();
  };
    // Fonction pour ouvrir l'éditeur d'email avec le contact pré-rempli
  const openEmailComposer = (contactEmail) => {
    setNewEmail({
      ...newEmail,
      to: [contactEmail], // Pré-remplit le champ "À" avec l'email du contact
      subject: '',
      body: '',
      cc: [],
      bcc: [],
      attachments: []
    });
    setIsComposing(true);
  };

  // Fonction pour envoyer un nouvel email
 const sendNewEmail = async () => {
  if (!newEmail.subject.trim() || !newEmail.body.trim() || newEmail.to.length === 0) {
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

    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      
    if (!token) {
      navigate('/login');
      return;
    }
    
    try {
      const tokenParts = token.split('.');
      if (tokenParts.length < 2) {
        throw new Error("Format de token invalide");
      }
      
      const payload = JSON.parse(atob(tokenParts[1]));
      
      const userData = {
        email: payload.email || payload.sub || 'user@example.com',
        userId: payload.id || payload.userId || payload.sub || 'user-id'
      };
      
      const emailData = {
        subject: newEmail.subject,
        body: newEmail.body,
        recipients: {
          to: formatRecipients(newEmail.to),
          cc: formatRecipients(newEmail.cc),
          bcc: formatRecipients(newEmail.bcc)
        },
        attachments: newEmail.attachments,
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
    } catch (tokenError) {
      console.error('Erreur lors du décodage du token:', tokenError);
    }
  } catch (error) {
    console.error('Error sending email:', error);
  } finally {
    setIsLoading(false);
  }
};

  // Fonction pour ajouter une pièce jointe à un nouvel email
  const addAttachment = (file) => {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const url = URL.createObjectURL(file);
      const attachment = {
        name: file.name,
        url: url,
        type: file.type,
        size: file.size
      };
      
      setNewEmail(prev => ({
        ...prev,
        attachments: [...prev.attachments, attachment]
      }));
    };
    fileReader.readAsDataURL(file);
  };

  // Fonction pour retirer une pièce jointe d'un nouvel email
  const removeAttachment = (index) => {
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
  




  // Récupérer les contacts
  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch('https://runova.onrender.com/api/contacts', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Erreur lors du chargement des contacts');
        }

        const data = await response.json();
        setContacts(data.data.contacts || []);
        setFilteredContacts(data.data.contacts || []);
      } catch (err) {
        setError(err.message);
        toast.error(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchContacts();
  }, []);

  // Récupérer les labels disponibles
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


      const data = await response.json();
      // Filtrer pour ne garder que les labels de type "contact"
      const contactLabels = (data.data.labels || []).filter(label => label.type === 'contact');
      setAvailableLabels(contactLabels);
    } catch (err) {
      console.error(err);
    }
  };


  fetchLabels();
}, []);


  // Filtrer les contacts selon la recherche
  useEffect(() => {
    if (searchQuery.length < 2) {
      // If there's a selected label, keep that filter applied
      if (selectedLabel) {
        const filtered = contacts.filter(contact =>
          contact.labels.some(label => label._id === selectedLabel)
        );
        setFilteredContacts(filtered);
      } else {
        setFilteredContacts(contacts);
      }
      return;
    }

    const filtered = contacts.filter(contact => {
      const query = searchQuery.toLowerCase();
      return (
        contact.name.toLowerCase().includes(query) ||
        contact.email.toLowerCase().includes(query) ||
        (contact.userDetails && (
          contact.userDetails.firstName.toLowerCase().includes(query) ||
          contact.userDetails.lastName.toLowerCase().includes(query)
        ))
      );
    });

    setFilteredContacts(filtered);
  }, [searchQuery, contacts, selectedLabel]);

  // Fermer le modal quand on clique à l'extérieur
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        closeModal();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Fonction du filtrage:
  const filterByLabel = (labelId) => {
    setSelectedLabel(labelId);

    if (!labelId) {
      setFilteredContacts(contacts);
      return;
    }

    const filtered = contacts.filter(contact =>
      contact.labels.some(label => label._id === labelId)
    );
    setFilteredContacts(filtered);
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      labels: []
    });
    setIsEditMode(false);
    setIsModalOpen(true);
  };

  const openEditModal = (contact) => {
    setSelectedContact(contact);
    setFormData({
      name: contact.name,
      email: contact.email,
      labels: contact.labels.map(label => label._id)
    });
    setIsEditMode(true);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedContact(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleLabelToggle = (labelId) => {
    setFormData(prev => {
      if (prev.labels.includes(labelId)) {
        return {
          ...prev,
          labels: prev.labels.filter(id => id !== labelId)
        };
      } else {
        return {
          ...prev,
          labels: [...prev.labels, labelId]
        };
      }
    });
  };

  // Modification de la fonction handleSubmit dans contact.jsx
const handleSubmit = async (e) => {
  e.preventDefault();
  
  try {
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    let response;

    if (isEditMode) {
      response = await fetch(`https://runova.onrender.com/api/contacts/${selectedContact.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
    } else {
      response = await fetch('https://runova.onrender.com/api/contacts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Erreur lors de la mise à jour du contact');
    }

    // Pour un nouveau contact ou une édition, récupérons le contact complet avec tous ses détails
    if (!isEditMode) {
      // Pour un nouveau contact, récupérons-le directement pour avoir les détails complets
      const contactId = data.data.contact.id;
      const contactResponse = await fetch(`https://runova.onrender.com/api/contacts/${contactId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (contactResponse.ok) {
        const contactData = await contactResponse.json();
        const newContact = contactData.data.contact;
        
        // Mettre à jour la liste des contacts avec le contact complet
        setContacts(prevContacts => [...prevContacts, newContact]);
        
        // Appliquer les filtres actuels
        if (selectedLabel) {
          setFilteredContacts(prevFiltered => {
            // Vérifier si le nouveau contact a le label sélectionné
            if (newContact.labels.some(label => label._id === selectedLabel)) {
              return [...prevFiltered, newContact];
            }
            return prevFiltered;
          });
        } else {
          setFilteredContacts(prevFiltered => [...prevFiltered, newContact]);
        }
      } else {
        // Si on n'arrive pas à récupérer le contact complet, on utilise la version simplifiée
        setContacts(prevContacts => [...prevContacts, data.data.contact]);
        
        if (!selectedLabel) {
          setFilteredContacts(prevFiltered => [...prevFiltered, data.data.contact]);
        }
      }
    } else {
      // Pour une édition, on met à jour le contact existant
      const updatedContacts = contacts.map(contact =>
        contact.id === selectedContact.id ? data.data.contact : contact
      );
      
      setContacts(updatedContacts);
      
      // Appliquer les filtres actuels
      if (selectedLabel) {
        const filtered = updatedContacts.filter(contact =>
          contact.labels.some(label => label._id === selectedLabel)
        );
        setFilteredContacts(filtered);
      } else {
        setFilteredContacts(updatedContacts);
      }
    }
    
    closeModal();
    toast.success(isEditMode ? 'Contact mis à jour avec succès' : 'Contact ajouté avec succès');
  } catch (err) {
    toast.error(err.message);
  }
};
  const handleDelete = async (contactId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce contact ?')) return;

    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      const response = await fetch(`https://runova.onrender.com/api/contacts/${contactId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Erreur lors de la suppression du contact');
      }

      const updatedContacts = contacts.filter(contact => contact.id !== contactId);
      setContacts(updatedContacts);
      
      // Appliquer les filtres actuels
      if (selectedLabel) {
        const filtered = updatedContacts.filter(contact =>
          contact.labels.some(label => label._id === selectedLabel)
        );
        setFilteredContacts(filtered);
      } else {
        setFilteredContacts(updatedContacts);
      }
      
      toast.success(data.message || 'Contact supprimé avec succès');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleBack = () => {
    navigate(-1);
  };

  // Fonction pour effacer la recherche et les filtres
  const clearFilters = () => {
    setSearchQuery('');
    setSelectedLabel(null);
    setFilteredContacts(contacts);
  };

  if (loading) return (
    <div className="loading-container">
      <div className="spinner"></div>
      <p>Chargement des contacts...</p>
    </div>
  );

  if (error) return (
    <div className="error-container">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
      </svg>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} className="retry-button">
        Réessayer
      </button>
    </div>
  
);
  
const saveDraft = async () => {
  try {
    setIsLoading(true);

    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    if (!token) {
      toast.error('Vous devez être connecté pour sauvegarder un brouillon');
      navigate('/login');
      return;
    }

    // Formatage cohérent des destinataires
    const formatRecipients = recipients => 
      recipients.map(r => {
        if (!r) return null;
        const emailMatch = r.match(/<(.+)>/);
        const nameMatch = r.match(/(.+)\</);
        const [email, name] = r.includes('<')
          ? [emailMatch ? emailMatch[1] : r, nameMatch ? nameMatch[1].trim() : '']
          : [r, ''];
        return { email, name };
      }).filter(Boolean);

    const payload = JSON.parse(atob(token.split('.')[1]));
    const userData = {
      email: payload.email || payload.sub || 'user@example.com',
      userId: payload.id || payload.userId || payload.sub || 'user-id'
    };

    const emailData = {
      subject: newEmail.subject,
      body: newEmail.body,
      recipients: {
        to: formatRecipients(newEmail.to),
        cc: formatRecipients(newEmail.cc),
        bcc: formatRecipients(newEmail.bcc)
      },
      sender: {
        email: userData.email,
        userId: userData.userId
      },
      attachments: newEmail.attachments,
      isDraft: true
    };

    const response = await fetch('https://runova.onrender.com/api/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(emailData)
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la sauvegarde du brouillon');
    }

    // Réinitialisation cohérente avec la structure initiale
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
    toast.success('Brouillon sauvegardé avec succès');
    
  } catch (error) {
    console.error('Error saving draft:', error);
    toast.error(error.message || 'Erreur lors de la sauvegarde du brouillon');
  } finally {
    setIsLoading(false);
  }
};
  return (
    <div className="contacts-container">
      <header className="contacts-header">
        <button className="back-button-small-contact" onClick={handleBack}>
        <FaArrowLeft />
      </button>
        <h1>Mes Contacts</h1>
        <div className="header-actions">
          <div className="search-bar">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher un contact..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="label-filter">
            <div className="filter-select-wrapper">
              <svg className="filter-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707l-6.414 6.414A1 1 0 0014 13v4.586a1 1 0 01-.293.707l-2 2A1 1 0 0110 20v-7a1 1 0 00-.293-.707L3.293 6.707A1 1 0 013 6V4z" />
              </svg>
              <select onChange={(e) => filterByLabel(e.target.value)} value={selectedLabel || ''} className="filter-select">
                <option value="">-- Filtrer par label --</option>
                {availableLabels.map(label => (
                  <option key={label._id} value={label._id}>
                    {label.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={openAddModal} className="add-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Ajouter
          </button>
        </div>
      </header>

      <div className="contacts-content">
        {filteredContacts.length > 0 ? (
          <div className="contacts-grid">
            {filteredContacts.map(contact => (
              <div key={contact.id} className="contact-card">
                <div className="contact-card-header">
               <div className="contact-avatar">
  {contact.userDetails?.profilePhoto ? (
    <img 
      src={`https://runova.onrender.com/uploads/profiles/${contact.userDetails.profilePhoto}`} 
      alt={contact.name}
      onError={(e) => {
        e.target.style.display = 'none';
        e.target.nextSibling.style.display = 'flex';
      }}
    />
  ) : null}
  
  <div 
    className="default-avatar" 
    style={{display: contact.userDetails?.profilePhoto ? 'none' : 'flex'}}
  >
    {contact.name?.charAt(0).toUpperCase()}
  </div>
  
  {contact.userDetails?.presenceStatus && (
    <div className={`status-indicator ${contact.userDetails.status}`}></div>
  )}
</div>
                </div>
                <div className="contact-info">
                  <h3>{contact.name}</h3>
                  <p className="contact-email">
                  {contact.email}</p>
                </div>
                <div className='contact-right'>
                  {contact.labels.length > 0 && (
                    <div className="contact-labels">
                      {contact.labels.map(label => (
                        <span 
                          key={label._id} 
                          className="label-tag"
                          style={{ backgroundColor: label.color }}
                        >
                          {label.name}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="contact-actions">
                    <button onClick={() => openEditModal(contact)} className="edit-button">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(contact.id)} className="delete-button">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                    </button>
                    <button className="mail-button" title="Envoyer un email"    onClick={() => openEmailComposer(contact.email)}>
                  
                      <FiMail />
                    </button>
                  
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 00-3-3.87" />
              <path d="M16 3.13a4 4 0 010 7.75" />
            </svg>
            <p>Aucun contact trouvé</p>
            {(searchQuery || selectedLabel) && (
              <button 
                onClick={clearFilters} 
                className="clear-search-button"
              >
                Effacer les filtres
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal pour ajouter/modifier un contact */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div ref={modalRef} className="contact-modal">
            <div className="modal-header">
              <h2>{isEditMode ? 'Modifier le contact' : 'Ajouter un contact'}</h2>
              <button onClick={closeModal} className="close-button">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-group">
                <label htmlFor="name">Nom</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Labels</label>
                <div className="labels-container">
                  {availableLabels.map(label => (
                    <div key={label._id} className="label-option">
                      <input
                        type="checkbox"
                        id={`label-${label._id}`}
                        checked={formData.labels.includes(label._id)}
                        onChange={() => handleLabelToggle(label._id)}
                      />
                      <label 
                        htmlFor={`label-${label._id}`} 
                        className="label-checkbox"
                        style={{ backgroundColor: label.color }}
                      >
                        {label.name}
                      </label>
                    </div>
                  ))}
                  {/* CORRIGÉ : Ajout d'un event qui sera capturé même si le bouton ne fonctionne pas */}
                  <button
                    type="button"
                    className="add-label-button"
                    onClick={(e) => {
                      e.preventDefault(); // Empêcher la soumission du formulaire
                      e.stopPropagation(); // Empêcher la propagation
                      console.log("Bouton + cliqué");
                      openAddLabelModal();
                    }}
                    title="Ajouter un label"
                  >
                    +
                  </button>
                  
                </div>
              </div>
              <div className="form-actions">
                <button type="button" onClick={closeModal} className="cancel-button">
                  Annuler
                </button>
                <button type="submit" className="submit-button">
                  {isEditMode ? 'Mettre à jour' : 'Ajouter'}
                </button>
              </div>
            </form>
            {isAddLabelOpen && (
                  <div className="modal-overlay" onClick={handleLabelModalClick}>
                    <div className="label-modal" onClick={handleLabelModalClick}>
                      <div className="modal-header">
                        <h2>Ajouter un label</h2>
                        <button onClick={closeAddLabelModal} className="close-button">
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <form onSubmit={handleAddLabelSubmit} className="label-form">
                        <div className="form-group">
                          <label htmlFor="labelName">Nom du label</label>
                          <input
                            type="text"
                            id="labelName"
                            value={newLabelName}
                            onChange={(e) => setNewLabelName(e.target.value)}
                            required
                            autoFocus
                          />
                        </div>
                        <div className="form-group">
                          <label htmlFor="labelColor">Couleur</label>
                          <input
                            type="color"
                            id="labelColor"
                            value={newLabelColor}
                            onChange={(e) => setNewLabelColor(e.target.value)}
                          />
                        </div>
                        <div className="form-actions">
                          <button type="button" onClick={closeAddLabelModal} className="cancel-button">
                            Annuler
                          </button>
                          <button type="submit" className="submit-button">
                            Ajouter
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
          </div>
        </div>
      )}

      {/* Modal pour composer un email (identique à votre page Index) */}
      {isComposing && (
        <div className="modal-overlay">
          <div className="compose-modal">
            <div className="compose-form-scrollable">
              <div className="compose-header">
                <h2>Nouvel email</h2>
                <button 
                  onClick={() => {
                    setIsComposing(false);
                    // Réinitialisation du formulaire
                    setNewEmail({
                      subject: '',
                      body: '',
                      to: [],
                      cc: [],
                      bcc: [],
                      attachments: [],
                      isDraft: false
                    });
                  }} 
                  className="close-modal"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              
              <div className="compose-form">
                <div className="compose-field">
                  <label>À:</label>
                  <input 
                    type="text" 
                    placeholder="email@runova.dz" 
                    value={newEmail.to.join(', ')}
                    onChange={(e) => setNewEmail({
                      ...newEmail,
                      to: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                    })}
                  />
                </div>
                
                <div className="compose-field">
                  <label>Cc:</label>
                  <input 
                    type="text" 
                    placeholder="CC@runova.dz" 
                    value={newEmail.cc.join(', ')}
                    onChange={(e) => setNewEmail({
                      ...newEmail,
                      cc: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                    })}
                  />
                </div>
                
                <div className="compose-field">
                  <label>Bcc:</label>
                  <input 
                    type="text" 
                    placeholder="Bcc@exemple.com" 
                    value={newEmail.bcc.join(', ')}
                    onChange={(e) => setNewEmail({
                      ...newEmail,
                      bcc: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                    })}
                  />
                </div>
                
                <div className="compose-field">
                  <label>Sujet:</label>
                  <input 
                    type="text" 
                    placeholder="Sujet de l'email" 
                    value={newEmail.subject}
                    onChange={(e) => setNewEmail({
                      ...newEmail,
                      subject: e.target.value
                    })}
                  />
                </div>
                
                  <label className='msg'>Message:</label>
                <div className="compose-body">
                  <textarea 
                    placeholder="Contenu de l'email..." 
                    value={newEmail.body}
                    onChange={(e) => setNewEmail({
                      ...newEmail,
                      body: e.target.value
                    })}
                  ></textarea>
                </div>
                
                <div className="attachments-section compact">
                  <div className="attachments-header">
                    <h3>Pièces jointes ({newEmail.attachments.length})</h3>
                    <label className="attachment-upload-btn">
                      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                      </svg>
                      <input 
                        type="file" 
                        multiple 
                        onChange={(e) => e.target.files && Array.from(e.target.files).forEach(addAttachment)}
                        hidden
                      />
                    </label>
                  </div>

                  <div className="attachments-grid">
                    {newEmail.attachments.map((attachment, index) => (
                      <div key={index} className="attachment-box">
                        <div className="attachment-icon">
                          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
                          </svg>
                        </div>
                        <div className="attachment-details">
                          <div className="attachment-name">{attachment.name}</div>
                          <div className="attachment-size">{formatFileSize(attachment.size)}</div>
                        </div>
                        <button 
                          onClick={() => removeAttachment(index)}
                          className="remove-btn"
                          title="Supprimer"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="compose-actions">
                <button 
                  onClick={sendNewEmail} 
                  className="send-btn" 
                  disabled={!newEmail.subject || !newEmail.body || newEmail.to.length === 0}
                >
                  <svg className="send-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  Envoyer
                </button>
                
               <button 
  onClick={saveDraft}
  disabled={isLoading}
>
  {isLoading ? 'Sauvegarde...' : 'Sauvegarder le brouillon'}
</button>
              </div>
              
               

            </div>
          </div>
        </div>
        
      )}
    </div>
    
  );
};

export default Contacts;