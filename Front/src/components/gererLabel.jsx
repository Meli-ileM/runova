import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import './gererLabel.css';

const API_BASE_URL = 'https://runova.onrender.com/api';

const GererLabel = () => {
  const [labels, setLabels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);

  const [activeTab, setActiveTab] = useState('email');

  const navigate = useNavigate();

  const handleRetour = () => {
    navigate('/index');
  };
  

  const [labelData, setLabelData] = useState({
    name: '',
    color: '#081F5C', // Couleur primaire par défaut
    type: 'email',
    associatedEmails: []
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

      const json = await response.json();
      return { success: response.ok, data: json };
    } catch (err) {
      console.error('Erreur API :', err);
      return { success: false, data: { message: 'Erreur réseau' } };
    }
  }, [navigate]);

  useEffect(() => {
    const loadLabels = async () => {
      setLoading(true);
      const { success, data } = await fetchApi('/labels');

      if (success) {
        setLabels(data.data.labels || []);
      } else {
        setError(data.message || 'Erreur de chargement des labels');
      }
      setLoading(false);
    };

    loadLabels();
  }, [fetchApi]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setLabelData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateLabel = async () => {
    const { success, data } = await fetchApi('/labels', {
      method: 'POST',
      body: JSON.stringify(labelData)
    });

    if (success) {
      setLabels([...labels, data.data.label]);
      resetModal();
    } else {
      alert(data.message || 'Erreur lors de la création du label');
    }
  };

  const handleUpdateLabel = async () => {
    const { success, data } = await fetchApi(`/labels/${editingLabel._id}`, {
      method: 'PUT',
      body: JSON.stringify(labelData)
    });

    if (success) {
      setLabels(labels.map(label => label._id === editingLabel._id ? data.data.label : label));
      resetModal();
    } else {
      alert(data.message || 'Erreur lors de la mise à jour');
    }
  };

  const handleDeleteLabel = async (id) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ce label?')) return;

    const { success, data } = await fetchApi(`/labels/${id}`, {
      method: 'DELETE'
    });

    if (success) {
      setLabels(labels.filter(label => label._id !== id));
    } else {
      alert(data.message || 'Échec de suppression');
    }
  };

  const handleEditClick = (label) => {
    setEditingLabel(label);
    setLabelData({
      name: label.name,
      color: label.color,
      type: label.type,
      associatedEmails: label.associatedEmails || []
    });
    setShowCreateModal(true);
  };

  const resetModal = () => {
    setLabelData({
      name: '',
      color: '#081F5C', // Couleur primaire par défaut
      type: 'email',
      associatedEmails: []
    });
    setEditingLabel(null);
    setShowCreateModal(false);
  };

  const emailLabels = labels.filter(label => label.type === 'email');
  const contactLabels = labels.filter(label => label.type === 'contact');

  if (loading) return (
    <div className="loading">
      <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="0" fill="none" stroke="currentColor" strokeWidth="2">
          <animate attributeName="r" from="0" to="10" dur="1.5s" begin="0s" repeatCount="indefinite"/>
          <animate attributeName="opacity" from="1" to="0" dur="1.5s" begin="0s" repeatCount="indefinite"/>
        </circle>
      </svg>
      <p>Chargement...</p>
    </div>
  );
  
  if (error) return (
    <div className="error">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16zM2 12C2 6.48 6.48 2 12 2s10 4.48 10 10-4.48 10-10 10S2 17.52 2 12zm11-1v-3a1 1 0 1 0-2 0v3a1 1 0 1 0 2 0zm-1 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" fill="currentColor"/>
      </svg>
      <p>Erreur : {error}</p>
    </div>
  );

  return (
    <div className="gerer-label-container">
      <button onClick={handleRetour} className="back-button">
       ← Retour
      </button>

      <h1>Gérer les Labels</h1>

      <button className="create-label-btn" onClick={() => setShowCreateModal(true)}>
        Créer un nouveau label
      </button>

      <div className="tabs">
        <button
          className={activeTab === 'email' ? 'active' : ''}
          onClick={() => setActiveTab('email')}
        >
          Labels Email
        </button>
        <button
          className={activeTab === 'contact' ? 'active' : ''}
          onClick={() => setActiveTab('contact')}
        >
          Labels Contact
        </button>
      </div>

<div className="labels-section">
  <h2>{activeTab === 'email' ? 'Labels Email' : 'Labels Contact'}</h2>
  {activeTab === 'email' ? (
    emailLabels.length === 0 ? (
      <p>Aucun label email disponible</p>
    ) : (
      <div className="labels-grid">
        {emailLabels.map(label => (
          <div key={label._id} className="label-card" style={{ borderLeftColor: label.color }}>
            <div className="label-info">
              <h3>{label.name}</h3>
              <p>Couleur : <span style={{ color: label.color, fontWeight: 'bold' }}>{label.color}</span></p>
              {label.associatedEmails?.length > 0 && (
                <p>Emails associés : <span>{label.associatedEmails.length}</span></p>
              )}
            </div>
            <div className="label-actions">
              <button onClick={() => handleEditClick(label)}>Modifier</button>
              <button className="delete-btn" onClick={() => handleDeleteLabel(label._id)}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    )
  ) : (
    contactLabels.length === 0 ? (
      <p>Aucun label contact disponible</p>
    ) : (
      <div className="labels-grid">
        {contactLabels.map(label => (
          <div key={label._id} className="label-card" style={{ borderLeftColor: label.color }}>
            <div className="label-info">
              <h3>{label.name}</h3>
              <p>Couleur : <span style={{ color: label.color, fontWeight: 'bold' }}>{label.color}</span></p>
            </div>
            <div className="label-actions">
              <button onClick={() => handleEditClick(label)}>Modifier</button>
              <button className="delete-btn" onClick={() => handleDeleteLabel(label._id)}>Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    )
  )}
</div>


      {showCreateModal && (
        <div className="modal-overlay" onClick={(e) => {
          if (e.target.className === 'modal-overlay') resetModal();
        }}>
          <div className="label-modal">
            <h2>{editingLabel ? 'Modifier le label' : 'Créer un nouveau label'}</h2>

            <div className="form-group">
              <label>Nom</label>
              <input 
                type="text" 
                name="name" 
                value={labelData.name} 
                onChange={handleInputChange} 
                placeholder="Nom du label" 
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Type</label>
              <select 
                name="type" 
                value={labelData.type} 
                onChange={handleInputChange} 
                disabled={!!editingLabel}
              >
                <option value="email">Email</option>
                <option value="contact">Contact</option>
              </select>
            </div>

            <div className="form-group">
              <label>Couleur</label>
              <input 
                type="color" 
                name="color" 
                value={labelData.color} 
                onChange={handleInputChange} 
              />
            </div>

            {labelData.type === 'email' && (
  <div className="form-group">
    <label>Adresses e-mail associées</label>
    <div className="email-bubble-input">
      <div className="email-bubbles">
        {labelData.associatedEmails.map((email, index) => (
          <span key={index} className="email-bubble">
            {email}
            <button
              className="remove-email"
              onClick={() => {
                const newEmails = [...labelData.associatedEmails];
                newEmails.splice(index, 1);
                setLabelData({ ...labelData, associatedEmails: newEmails });
              }}
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={labelData.emailInput || ''}
          onChange={(e) => setLabelData({ ...labelData, emailInput: e.target.value })}
          onKeyDown={(e) => {
            const trimmed = (labelData.emailInput || '').trim().replace(/,+$/, '');
            if ((e.key === 'Enter' || e.key === ',') && trimmed) {
              e.preventDefault();
              if (
                !labelData.associatedEmails.includes(trimmed) &&
                /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)
              ) {
                setLabelData({
                  ...labelData,
                  associatedEmails: [...labelData.associatedEmails, trimmed],
                  emailInput: ''
                });
              }
            } else if (e.key === 'Backspace' && !labelData.emailInput && labelData.associatedEmails.length > 0) {
              setLabelData({
                ...labelData,
                associatedEmails: labelData.associatedEmails.slice(0, -1)
              });
            }
          }}
          placeholder="Saisir une adresse email et appuyer sur Entrée"
        />
      </div>
    </div>
  </div>
)}


            <div className="modal-actions">
              <button onClick={editingLabel ? handleUpdateLabel : handleCreateLabel}>
                {editingLabel ? 'Mettre à jour' : 'Créer'}
              </button>
              <button onClick={resetModal} className="cancel-btn">Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GererLabel;