import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import './auth.css';
import logo from '../../assets/logo.png';
import logo2 from '../../assets/logonoback.png';
import CryptoService from '../../utils/cryptoService';

const Register = () => {
  const navigate = useNavigate();
  const [formStep, setFormStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ score: 0, message: 'Faible' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enable2FA, setEnable2FA] = useState(true); // Défaut à true car obligatoire
  const [twoFactorData, setTwoFactorData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [emailError, setEmailError] = useState('');
  const [ageError, setAgeError] = useState('');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nom: '',
    prenom: '',
    birthdate: '',
    profile_photo: null,
    acceptTerms: false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Réinitialiser les erreurs lors de la modification
    if (name === 'email') {
      setEmailError('');
    }
    if (name === 'birthdate') {
      setAgeError('');
    }

    if (name === 'password') evaluatePasswordStrength(value);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, profile_photo: file }));
    }
  };

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

  const validateEmail = (email) => {
    // Vérifier si l'email se termine par @runova.dz
    if (!email.toLowerCase().endsWith('@runova.dz')) {
      setEmailError('Seules les adresses email @runova.dz sont autorisées');
      return false;
    }
    return true;
  };

  const validateAge = (birthdate) => {
    if (!birthdate) return true; // Si pas de date de naissance fournie, on passe

    const today = new Date();
    const birthDate = new Date(birthdate);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    // Vérifier si l'âge est d'au moins 18 ans
    if (age < 18) {
      setAgeError('Vous devez avoir au moins 18 ans pour vous inscrire');
      return false;
    }
    
    return true;
  };

  const nextStep = (e) => {
    e.preventDefault();
    
    // Vérifier l'email à la première étape
    if (formStep === 1) {
      if (!validateEmail(formData.email)) {
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        alert("Les mots de passe ne correspondent pas.");
        return;
      }
    }
    
    // Vérifier l'âge à la deuxième étape
    if (formStep === 2) {
      if (!validateAge(formData.birthdate)) {
        return;
      }
    }
    
    setFormStep(s => s + 1);
  };

  const prevStep = () => setFormStep(s => s - 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Vérifier à nouveau l'email et l'âge avant la soumission finale
    if (!validateEmail(formData.email) || !validateAge(formData.birthdate)) {
      return;
    }
    
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Préparation des données
      const formDataToSend = new FormData();
      formDataToSend.append('email', formData.email);
      formDataToSend.append('password', formData.password);
      formDataToSend.append('nom', formData.nom || '');
      formDataToSend.append('prenom', formData.prenom || '');
      formDataToSend.append('birthdate', formData.birthdate || '');
      formDataToSend.append('enable2FA', enable2FA);
      
      if (formData.profile_photo) {
        formDataToSend.append('profile_photo', formData.profile_photo);
      }
    
      console.log("Envoi de la requête d'inscription...");
      const response = await fetch('https://runova.onrender.com/api/auth/register', {
        method: 'POST',
        body: formDataToSend
      });
    
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erreur HTTP: ${response.status} - ${errorText}`);
      }
    
      const data = await response.json();
      
      // Si 2FA est activé, afficher le QR code pour configuration
      if (enable2FA && data.twoFactorSetup) {
        setTwoFactorData(data.twoFactorSetup);
        setFormStep(4); // Aller à l'étape de vérification 2FA
        
        // Stocker temporairement le token pour la validation finale
        sessionStorage.setItem('tempAuthToken', data.token);
        localStorage.setItem('tempUserData', JSON.stringify(data.user));
        
        setIsSubmitting(false);
        return;
      }
      
      // Stocker le token et les infos utilisateur
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      
      // 2. Générer les clés cryptographiques
      console.log("Génération des clés de chiffrement...");
      const { publicKey, encryptedPrivateKey } = await CryptoService.generateUserKeys(
        formData.email, 
        formData.password
      );
      
      console.log("Clés générées avec succès");
      
      // 3. Envoyer les clés au serveur
      const keysResponse = await fetch('https://runova.onrender.com/api/keys/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${data.token}`
        },
        body: JSON.stringify({
          publicKey,
          encryptedPrivateKey
        })
      });
      
      if (!keysResponse.ok) {
        throw new Error('Erreur lors du stockage des clés');
      }
      
      alert('Inscription réussie !');
      navigate('/login');
      
    } catch (error) {
      console.error('Erreur complète:', error);
      alert(error.message || 'Erreur lors de l\'inscription');
    } finally {
      setIsSubmitting(false);
    }
  };

  const verifyTwoFactorCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      alert("Veuillez saisir un code à 6 chiffres valide");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const tempToken = sessionStorage.getItem('tempAuthToken');
      
      const response = await fetch('https://runova.onrender.com/api/auth/enable-2fa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({
          token: verificationCode
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Erreur de validation');
      }
      
      // Génération des clés après validation 2FA
      const tempUserData = JSON.parse(localStorage.getItem('tempUserData'));
      
      const { publicKey, encryptedPrivateKey } = await CryptoService.generateUserKeys(
        formData.email, 
        formData.password
      );
      
      const keysResponse = await fetch('https://runova.onrender.com/api/keys/store', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${tempToken}`
        },
        body: JSON.stringify({
          publicKey,
          encryptedPrivateKey
        })
      });
      
      if (!keysResponse.ok) {
        throw new Error('Erreur lors du stockage des clés');
      }
      
      // Sauvegarde finale des données d'authentification
      localStorage.setItem('authToken', tempToken);
      localStorage.setItem('userData', JSON.stringify(tempUserData));
      
      // Nettoyer les données temporaires
      sessionStorage.removeItem('tempAuthToken');
      localStorage.removeItem('tempUserData');
      
      alert('Inscription terminée avec succès ! 2FA activé.');
      navigate('/login');
      
    } catch (error) {
      console.error('Erreur lors de la vérification 2FA:', error);
      alert(error.message || 'Échec de la vérification du code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrengthClass = () => {
    if (passwordStrength.score >= 4) return 'strength-strong';
    if (passwordStrength.score === 3) return 'strength-medium';
    return 'strength-weak';
  };

  return (
    <div className="sign-container">
      <div className="sign-content">
        <div className="auth-branding">
          <img src={logo2} alt="RUNOVA" className="auth-logo" />
          <img src={logo} alt="RUNOVA" className="auth-logo" />
          <p className="auth-tagline">Rejoignez RUNOVA pour des communications sécurisées</p>
        </div>

        <div className="auth-card signup-card">
          <h1 className="sign-header">Créer un compte</h1>

          <div className="form-progress">
            {[1, 2, 3].map(step => (
              <React.Fragment key={step}>
                <div className={`progress-step ${formStep >= step ? 'active' : ''}`}>{step}</div>
                {step < 3 && <div className="progress-line"></div>}
              </React.Fragment>
            ))}
            <div className="progress-line"></div>
            <div className={`progress-step ${formStep >= 4 ? 'active' : ''}`}>4</div>
          </div>

          {formStep === 1 && (
            <form className="auth-form" onSubmit={nextStep}>
              <div className="form-group">
                <label htmlFor="email">Adresse email*</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="votre@runova.dz"
                  required
                  pattern="[a-zA-Z0-9]+@runova\.dz$"
                  title="L'adresse email doit se terminer par @runova.dz"
                />
                {emailError && <div className="error-message">{emailError}</div>}
                <small>Seules les adresses du domaine @runova.dz sont acceptées</small>
              </div>

              <div className="form-group">
                <label htmlFor="password">Mot de passe*</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Créez un mot de passe fort"
                    minLength="8"
                    required
                  />
                  <button
                    type="button"
                    className="toggle-password"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? "Masquer" : "Afficher"}
                  </button>
                </div>
                <div className={`password-strength ${getPasswordStrengthClass()}`}>
                <div className="strength-bar">
    <div
      className="strength-indicator"
      style={{ width: `${(passwordStrength.score / 5) * 100}%` }}
    ></div>
  </div>
                  <span className="strength-text">{passwordStrength.message}</span>
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="confirmPassword">Confirmer le mot de passe*</label>
                <input
                  type={showPassword ? "text" : "password"}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Répétez le mot de passe"
                  required
                />
              </div>

              <button type="submit" className="auth-button">Continuer</button>
            </form>
          )}

          {formStep === 2 && (
            <form className="auth-form" onSubmit={nextStep}>
              <div className="form-group">
                <label htmlFor="nom">Nom</label>
                <input
                  type="text"
                  id="nom"
                  name="nom"
                  value={formData.nom}
                  onChange={handleChange}
                  placeholder="Votre nom"
                />
              </div>

              <div className="form-group">
                <label htmlFor="prenom">Prénom</label>
                <input
                  type="text"
                  id="prenom"
                  name="prenom"
                  value={formData.prenom}
                  onChange={handleChange}
                  placeholder="Votre prénom"
                />
              </div>

              <div className="form-group">
                <label htmlFor="birthdate">Date de naissance*</label>
                <input
                  type="date"
                  id="birthdate"
                  name="birthdate"
                  value={formData.birthdate}
                  onChange={handleChange}
                  required
                 
                />
                {ageError && <div className="error-message">{ageError}</div>}
                <small>Vous devez avoir au moins 18 ans pour créer un compte</small>
              </div>

              <div className="form-actions">
                <button type="button" className="back-button" onClick={prevStep}>Retour</button>
                <button type="submit" className="auth-button">Continuer</button>
              </div>
            </form>
          )}

          {formStep === 3 && (
            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label htmlFor="profile_photo">Photo de profil</label>
                <input
                  type="file"
                  id="profile_photo"
                  name="profile_photo"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="file-input"
                />
              </div>
              
              <div className="form-group security-required">
          
                
                <div className="checkbox-group required-2fa">
                  <input
                    type="checkbox"
                    id="enable2FA"
                    name="enable2FA"
                    checked={enable2FA}
                    onChange={(e) => setEnable2FA(e.target.checked)}
                    required
                  />
                  <label htmlFor="enable2FA">
                    <strong>Activer l'authentification à deux facteurs (2FA) </strong>
                  </label>
                  <small className="security-info">
                    Pour garantir la sécurité de votre compte et de vos communications sur RUNOVA.</small>
                </div>
              </div>

              <div className="form-group checkbox-group">
                <input
                  type="checkbox"
                  id="acceptTerms"
                  name="acceptTerms"
                  checked={formData.acceptTerms}
                  onChange={handleChange}
                  required
                />
                <label htmlFor="acceptTerms">
                  J'accepte les <Link to="/terms" className="auth-link" target="_blank" rel="noopener noreferrer">Conditions et la Politique</Link>
                </label>
              </div>

              <div className="form-actions">
                <button type="button" className="back-button" onClick={prevStep}>Retour</button>
                <button 
                  type="submit" 
                  className="auth-button" 
                  disabled={isSubmitting || !formData.acceptTerms || !enable2FA}
                >
                  {isSubmitting ? 'Création en cours...' : 'Créer mon compte'}
                </button>
              </div>
            </form>
          )}
          
          {formStep === 4 && twoFactorData && (
            <div className="auth-form two-factor-setup">
              <h2>Configuration de la double authentification</h2>
              
              <div className="qr-container">
                <p>Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)</p>
                <img src={twoFactorData.qrCode} alt="QR Code 2FA" className="qr-code" />
              </div>
              
              <div className="form-group">
                <label htmlFor="verificationCode">Code de vérification</label>
                <input
                  type="text"
                  id="verificationCode"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="Entrez le code à 6 chiffres"
                  maxLength="6"
                  required
                />
                <small>Entrez le code généré par votre application</small>
              </div>
              
              <div className="form-actions">
                <button
                  type="button"
                  className="auth-button"
                  onClick={verifyTwoFactorCode}
                  disabled={isSubmitting || verificationCode.length !== 6}
                >
                  {isSubmitting ? 'Vérification...' : 'Vérifier et terminer'}
                </button>
              </div>
            </div>
          )}

          <div className="auth-switch">
            Vous avez déjà un compte ? <Link to="/login">Connectez-vous</Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;