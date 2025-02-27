
import React, { useState } from 'react';
import './auth.css';
import logo from '../../assets/logo.png';
import logo2 from '../../assets/logonoback.png';
import { Link, useNavigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [twoFactorToken, setTwoFactorToken] = useState('');
  const [awaitingTwoFactor, setAwaitingTwoFactor] = useState(false);
  const [userId, setUserId] = useState(null);
  const [twoFactorQrCode, setTwoFactorQrCode] = useState(null);
  const [needsSetup2FA, setNeedsSetup2FA] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
  
    try {
      const response = await fetch('https://runova.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          rememberMe,
          twoFactorToken: awaitingTwoFactor ? twoFactorToken : undefined 
        }),
      });
  
      const data = await response.json();
      
      // Vérifier si l'utilisateur a besoin de configurer le 2FA
      if (data.status === 'needs_2fa_setup') {
        setNeedsSetup2FA(true);
        setTwoFactorQrCode(data.twoFactorSetup.qrCode);
        setUserId(data.userId);
        setIsLoading(false);
        return;
      }
      
      // Vérifier si on attend une authentification 2FA
      if (data.status === 'pending_2fa') {
        setAwaitingTwoFactor(true);
        setUserId(data.userId);
        setIsLoading(false);
        return;
      }
  
      if (!response.ok) throw new Error(data.message || 'Échec de connexion');
  
      if (!data.token || !data.user) {
        throw new Error('Réponse serveur invalide');
      }
  
      // Stockage sécurisé
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('authToken', data.token);
      storage.setItem('userData', JSON.stringify(data.user));
      sessionStorage.setItem('encryptionPassword', password);

      navigate('/index');

    } catch (err) {
      console.error('Erreur détaillée:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleVerify2FA = async () => {
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      setError('Veuillez saisir un code à 6 chiffres valide');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('https://runova.onrender.com/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          token: twoFactorToken
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Code d\'authentification invalide');
      
      if (!data.token || !data.user) {
        throw new Error('Réponse serveur invalide');
      }
      
      // Stockage sécurisé
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('authToken', data.token);
      storage.setItem('userData', JSON.stringify(data.user));
      sessionStorage.setItem('encryptionPassword', password);
      
      navigate('/index');
      
    } catch (err) {
      console.error('Erreur 2FA:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSetup2FA = async () => {
    if (!twoFactorToken || twoFactorToken.length !== 6) {
      setError('Veuillez saisir un code à 6 chiffres valide');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      // Appel à l'API pour vérifier et activer le 2FA
      const response = await fetch('https://runova.onrender.com/api/auth/enable-2fa', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('tempAuthToken')}` 
        },
        body: JSON.stringify({
          token: twoFactorToken
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Code d\'authentification invalide');
      
      // Après activation réussie, récupérer le token d'authentification permanent
      const loginResponse = await fetch('https://runova.onrender.com/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          password, 
          rememberMe,
          twoFactorToken 
        }),
      });
      
      const loginData = await loginResponse.json();
      
      if (!loginResponse.ok) throw new Error(loginData.message || 'Échec de connexion');
      
      if (!loginData.token || !loginData.user) {
        throw new Error('Réponse serveur invalide');
      }
      
      // Stockage sécurisé
      const storage = rememberMe ? localStorage : sessionStorage;
      storage.setItem('authToken', loginData.token);
      storage.setItem('userData', JSON.stringify(loginData.user));
      sessionStorage.setItem('encryptionPassword', password);
      
      // Nettoyer les données temporaires
      sessionStorage.removeItem('tempAuthToken');
      
      alert('2FA configuré avec succès !');
      navigate('/index');
      
    } catch (err) {
      console.error('Erreur configuration 2FA:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-content">
        <div className="auth-branding">
          <img src={logo2} alt="RUNOVA" className="auth-logo" />
          <h2>Bienvenue sur </h2>
          <img src={logo} alt="RUNOVA" className="auth-logo" />
          <p className="auth-tagline">Sécurisez vos communications avec notre plateforme de confiance</p>
        </div>
        
        <div className="auth-card">
          <div className="auth-header">
            {needsSetup2FA ? (
              <h1>Configuration de la double authentification</h1>
            ) : awaitingTwoFactor ? (
              <h1>Authentification à deux facteurs</h1>
            ) : (
              <h1>Connexion</h1>
            )}
            {error && <div className="auth-error">{error}</div>}
          </div>

          {!awaitingTwoFactor && !needsSetup2FA ? (
            <form className="auth-form" onSubmit={handleSubmit}>
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
                <label htmlFor="password">Mot de passe</label>
                <div className="password-input-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
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
              </div>

              <div className="form-row">
                <div className="checkbox-container">
                  <input
                    type="checkbox"
                    id="rememberMe"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                  />
                  <label htmlFor="rememberMe">Se souvenir de moi</label>
                </div>
                <Link to="/ForgotPassword" className="forgot-password">
                  Mot de passe oublié?
                </Link>
              </div>

              <button 
                type="submit" 
                className="auth-button"
                disabled={isLoading}
              >
                {isLoading ? 'Connexion en cours...' : 'Se connecter'}
              </button>
            </form>
          ) : needsSetup2FA ? (
            <div className="auth-form">
              <div className="two-factor-info">
                <p>Vous devez configurer l'authentification à deux facteurs pour votre compte.</p>
              </div>
              
              <div className="qr-container">
                <p>Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)</p>
                {twoFactorQrCode && (
                  <img src={twoFactorQrCode} alt="QR Code 2FA" className="qr-code" />
                )}
              </div>
              
              <div className="form-group">
                <label htmlFor="twoFactorToken">Code d'authentification</label>
                <input
                  type="text"
                  id="twoFactorToken"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  autoComplete="off"
                  required
                />
                <small>Entrez le code généré par votre application</small>
              </div>
              
              <button 
                onClick={handleSetup2FA}
                className="auth-button"
                disabled={isLoading || twoFactorToken.length !== 6}
              >
                {isLoading ? 'Configuration...' : 'Configurer et se connecter'}
              </button>
              
              <button 
                onClick={() => {
                  setNeedsSetup2FA(false);
                  setTwoFactorToken('');
                }}
                className="back-button"
                type="button"
              >
                Retour
              </button>
            </div>
          ) : (
            <div className="auth-form">
              <div className="two-factor-info">
                <p>Veuillez entrer le code à 6 chiffres généré par votre application d'authentification.</p>
              </div>
              
              <div className="form-group">
                <label htmlFor="twoFactorToken">Code d'authentification</label>
                <input
                  type="text"
                  id="twoFactorToken"
                  value={twoFactorToken}
                  onChange={(e) => setTwoFactorToken(e.target.value.replace(/\D/g, '').substring(0, 6))}
                  placeholder="123456"
                  maxLength="6"
                  autoComplete="off"
                  required
                />
              </div>
              
              <button 
                onClick={handleVerify2FA}
                className="auth-button"
                disabled={isLoading || twoFactorToken.length !== 6}
              >
                {isLoading ? 'Vérification...' : 'Vérifier'}
              </button>
              
              <button 
                onClick={() => {
                  setAwaitingTwoFactor(false);
                  setTwoFactorToken('');
                }}
                className="back-button"
                type="button"
              >
                Retour
              </button>
            </div>
          )}

          <div className="auth-divider">
            <span>ou</span>
          </div>

          <div className="alternative-auth">
            <p>
              Pas encore de compte? <Link to="/register" className="auth-link">Créer un compte</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;