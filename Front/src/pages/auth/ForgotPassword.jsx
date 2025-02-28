
import React, { useState } from 'react';
import './auth.css';
import logo from '../../assets/logo.png';
import logo2 from '../../assets/logonoback.png';
import { useNavigate } from 'react-router-dom';
import CryptoService from '../../utils/cryptoService';

const ForgotPassword = () => {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: 'Faible' });
  const [userHasPrivateKey, setUserHasPrivateKey] = useState(false);
  const [acceptDataLoss, setAcceptDataLoss] = useState(false);
  const [showConsequences, setShowConsequences] = useState(false);
  const navigate = useNavigate();

  const evaluatePasswordStrength = (password) => {
    const score = [
      password.length >= 8,
      /[A-Z]/.test(password),
      /[a-z]/.test(password),
      /\d/.test(password),
      /[^A-Za-z0-9]/.test(password)
    ].filter(Boolean).length;

    const message = score >= 4 ? 'Fort' : score === 3 ? 'Moyen' : 'Faible';
    setPasswordStrength({ score, message });
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setNewPassword(value);
    evaluatePasswordStrength(value);
  };

  const verify2FA = async () => {
    if (!email) {
      setError('Veuillez entrer votre adresse email');
      return;
    }

    if (code.length !== 6) {
      setError('Le code doit contenir 6 chiffres');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('https://runova.onrender.com/api/auth/verify-2fa-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Code invalide ou expiré.");
      }

      // Vérifier si l'utilisateur a une clé privée chiffrée
      try {
        const keyCheckRes = await fetch(`https://runova.onrender.com/api/auth/check-private-key?email=${encodeURIComponent(email)}`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const keyCheckData = await keyCheckRes.json();
        
        if (keyCheckRes.ok && keyCheckData.hasPrivateKey) {
          setUserHasPrivateKey(true);
        }
      } catch (keyCheckError) {
        console.error("Erreur lors de la vérification de la clé privée:", keyCheckError);
      }

      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordStrength.score < 3) {
      setError('Le mot de passe est trop faible');
      return;
    }

    // Si l'utilisateur a une clé privée et n'accepte pas la perte de données
    if (userHasPrivateKey && !acceptDataLoss) {
      setError('Vous devez accepter la perte de vos données chiffrées pour continuer');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      let newEncryptedPrivateKey = null;

      // Si l'utilisateur accepte la perte de données, on génère de nouvelles clés
      if (userHasPrivateKey && acceptDataLoss) {
        try {
          // Générer de nouvelles clés avec le nouveau mot de passe
          const newKeys = await CryptoService.generateUserKeys(email, newPassword);
          newEncryptedPrivateKey = newKeys.encryptedPrivateKey;
          
          console.log('Nouvelles clés générées pour remplacer les anciennes');
        } catch (cryptoError) {
          console.error('Erreur lors de la génération des nouvelles clés:', cryptoError);
          setError('Impossible de générer de nouvelles clés de sécurité');
          return;
        }
      }

      // Envoyer la demande de réinitialisation
      const requestBody = { 
        email, 
        newPassword, 
        code,
        replacePrivateKey: userHasPrivateKey && acceptDataLoss
      };

      // Ajouter la nouvelle clé chiffrée si elle a été générée
      if (newEncryptedPrivateKey) {
        requestBody.newEncryptedPrivateKey = newEncryptedPrivateKey;
      }

      const res = await fetch('https://runova.onrender.com/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Échec de la mise à jour du mot de passe.");
      }

      setMessage("Mot de passe mis à jour avec succès. Vous pouvez maintenant vous connecter.");
      setStep(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getPasswordStrengthClass = () => {
    if (passwordStrength.score >= 4) return 'strength-strong';
    if (passwordStrength.score === 3) return 'strength-medium';
    return 'strength-weak';
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="auth-branding">
          <img src={logo2} alt="RUNOVA" className="auth-logo" />
          <h2>Réinitialiser le mot de passe</h2>
          <img src={logo} alt="RUNOVA" className="auth-logo" />
          <p className="auth-tagline">Restaurez l'accès à votre compte sécurisé</p>
          
         
        </div>
        
        <div className="auth-card">
          <div className="auth-header">
            {step === 1 && <h1>Vérification d'identité</h1>}
            {step === 2 && <h1>Nouveau mot de passe</h1>}
            {step === 3 && <h1>Réinitialisation terminée</h1>}
            
            {error && <div className="auth-error">{error}</div>}
            {message && <div className="auth-success">{message}</div>}
          </div>

          {step === 1 && (
            <form className="auth-form" onSubmit={(e) => { e.preventDefault(); verify2FA(); }}>
              <div className="form-group">
                <label htmlFor="email">Adresse email</label>
                <input 
                  type="email"
                  id="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="votre@runova.dz" 
                  required 
                />
              </div>

              <div className="form-group">
                <label htmlFor="code">Code d'authentification à deux facteurs</label>
                <input 
                  type="text"
                  id="code"
                  value={code} 
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').substring(0, 6))} 
                  placeholder="123456" 
                  maxLength={6}
                  autoComplete="off"
                  required
                />
                <small>
                  Entrez le code généré par votre application d'authentification (Google Authenticator, Authy, etc.)
                </small>
              </div>

              <button 
                type="submit"
                className="auth-button"
                disabled={isLoading || code.length !== 6}
              >
                {isLoading ? 'Vérification en cours...' : 'Vérifier mon identité'}
              </button>
              
              <div className="alternative-auth">
                <p>
                  Vous vous souvenez de votre mot de passe? 
                  <button 
                    type="button"
                    onClick={() => navigate('/login')} 
                    className="auth-link"
                    style={{ background: 'none', border: 'none', color: '#16213e', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Se connecter
                  </button>
                </p>
              </div>
            </form>
          )}

          {step === 2 && (
            <div className="auth-form">
              {userHasPrivateKey && (
                <div style={{
                  backgroundColor: '#f8d7da',
                  border: '1px solid #dc3545',
                  borderRadius: '6px',
                  padding: '12px',
                  marginBottom: '15px',
                  fontSize: '14px'
                }}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    marginBottom: '10px',
                    color: '#721c24'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{ marginRight: '8px', fontSize: '18px' }}>⚠️</span>
                      <strong>Données chiffrées détectées</strong>
                    </div>
                    <button 
                      type="button"
                      onClick={() => setShowConsequences(!showConsequences)}
                      style={{
                        background: 'none',
                        border: '1px solid #721c24',
                        borderRadius: '4px',
                        color: '#721c24',
                        padding: '4px 8px',
                        fontSize: '12px',
                        cursor: 'pointer'
                      }}
                    >
                      {showConsequences ? 'Masquer' : 'En savoir plus'}
                    </button>
                  </div>
                  
                  {showConsequences && (
                    <div style={{ 
                      marginBottom: '12px',
                      padding: '10px',
                      backgroundColor: '#f5c6cb',
                      borderRadius: '4px',
                      fontSize: '13px',
                      lineHeight: '1.4'
                    }}>
                      <h5 style={{ margin: '0 0 8px 0', color: '#721c24' }}>
                        Conséquences de la réinitialisation :
                      </h5>
                      <ul style={{ margin: '0', paddingLeft: '18px', color: '#721c24' }}>
                        <li>Perte définitive de tous vos messages chiffrés</li>
                        <li>Perte de vos fichiers et documents chiffrés</li>
                        <li>Historique des conversations irrécupérable</li>
                        <li>Nouvelles clés de sécurité générées automatiquement</li>
                        <li>Impossibilité de récupérer les anciennes données</li>
                      </ul>
                      <p style={{ 
                        margin: '10px 0 0 0', 
                        fontStyle: 'italic',
                        color: '#a94442'
                      }}>
                        💡 Alternative : Si vous vous souvenez de votre ancien mot de passe, 
                        utilisez "Changer le mot de passe" dans les paramètres pour conserver vos données.
                      </p>
                    </div>
                  )}
                  
                  <label style={{ 
                    display: 'flex', 
                    alignItems: 'flex-start', 
                    color: '#721c24',
                    cursor: 'pointer',
                    fontSize: '13px',
                    lineHeight: '1.3'
                  }}>
                    <input 
                      type="checkbox" 
                      checked={acceptDataLoss}
                      onChange={(e) => setAcceptDataLoss(e.target.checked)}
                      style={{ 
                        marginRight: '8px',
                        marginTop: '2px',
                        flexShrink: 0
                      }}
                    />
                    <span>
                      Je comprends les conséquences et j'accepte la perte définitive de mes données chiffrées
                    </span>
                  </label>
                </div>
              )}

              <div className="form-group">
                <label htmlFor="newPassword">Nouveau mot de passe</label>
                <div className="password-input-container">
                  <input 
                    type={showPassword ? "text" : "password"}
                    id="newPassword"
                    value={newPassword} 
                    onChange={handlePasswordChange} 
                    placeholder="Créez un mot de passe fort" 
                    required
                  />
                  <button 
                    type="button" 
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? "Masquer" : "Afficher"}
                  </button>
                </div>
                <div className={`password-strength ${getPasswordStrengthClass()}`}>
                  <div
                    className="strength-indicator"
                    style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
                  ></div>
                  <span className="strength-text">{passwordStrength.message}</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmer le nouveau mot de passe</label>
                <div className="password-input-container">
                  <input 
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    placeholder="Retapez votre nouveau mot de passe" 
                    required
                  />
                  <button 
                    type="button" 
                    className="toggle-password"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label={showConfirmPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showConfirmPassword ? "Masquer" : "Afficher"}
                  </button>
                </div>
              </div>

              <button 
                onClick={resetPassword} 
                className="auth-button"
                disabled={
                  isLoading || 
                  newPassword !== confirmPassword || 
                  passwordStrength.score < 3 ||
                  (userHasPrivateKey && !acceptDataLoss)
                }
              >
                {isLoading ? 'Mise à jour en cours...' : 'Réinitialiser le mot de passe'}
              </button>

              <button 
                onClick={() => setStep(1)} 
                className="back-button"
                type="button"
              >
                Retour
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="auth-form">
              <div className="success-message">
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <span style={{ fontSize: '48px', color: '#28a745' }}>✅</span>
                </div>
                <p style={{ textAlign: 'center', fontSize: '18px', fontWeight: 'bold', color: '#28a745' }}>
                  Votre mot de passe a été réinitialisé avec succès.
                </p>
                
                {userHasPrivateKey ? (
                  <div style={{ 
                    backgroundColor: '#f8d7da', 
                    border: '1px solid #dc3545', 
                    borderRadius: '8px', 
                    padding: '16px', 
                    margin: '20px 0' 
                  }}>
                    <p style={{ color: '#721c24', margin: '0 0 8px 0', fontWeight: 'bold' }}>
                      🔄 <strong>Nouvelles clés générées:</strong> De nouvelles clés de sécurité ont été créées pour votre compte.
                    </p>
                    <p style={{ color: '#721c24', margin: 0 }}>
                      ⚠️ <strong>Données perdues:</strong> Vos anciennes données chiffrées ne sont plus accessibles.
                    </p>
                  </div>
                ) : (
                  <p style={{ textAlign: 'center', color: '#6c757d' }}>
                    Aucune donnée chiffrée n'a été affectée.
                  </p>
                )}
                
                <button 
                  onClick={() => navigate('/login')} 
                  className="auth-button"
                  style={{ width: '100%', marginTop: '20px' }}
                >
                  Se connecter
                </button>
              </div>
            </div>
          )}

          <div className="auth-divider">
            <span>Conseil de sécurité</span>
          </div>

          <div className="alternative-auth">
            <p style={{ fontSize: '13px', color: '#6c757d', textAlign: 'center' }}>
              Si vous vous souvenez de votre ancien mot de passe, utilisez plutôt la fonction 
              "Changer le mot de passe" depuis les paramètres de votre compte pour éviter la perte de données.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;