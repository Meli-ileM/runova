import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { requestPhoneOTP, verifyPhoneOTP, linkPhoneToAccount } from '../utils/firebaseAuth';

const PhoneAuthentication = ({ onSuccess, userData }) => {
  const [phone, setPhone] = useState('');
  const [verificationId, setVerificationId] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [error, setError] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [isVerified, setIsVerified] = useState(false);

  // Check if the phone is valid and not empty
  const isPhoneValid = () => {
    return phone && phone.length >= 8; // Basic validation
  };

  // Handle phone number change
  const handlePhoneChange = (value) => {
    setPhone(value);
    setError('');
  };

  // Request OTP
  const handleRequestOTP = async (e) => {
    e.preventDefault();
    
    if (!isPhoneValid()) {
      setError('Veuillez entrer un numéro de téléphone valide');
      return;
    }
    
    setIsSendingCode(true);
    setError('');
    
    try {
      // Format phone with + sign if not already present
      const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
      
      const result = await requestPhoneOTP(formattedPhone, 'recaptcha-container');
      
      if (result.success) {
        setConfirmResult(result.confirmationResult);
        setIsVerifying(true);
      } else {
        setError(result.error || 'Erreur lors de l\'envoi du code');
      }
    } catch (err) {
      console.error('Error requesting OTP:', err);
      setError('Erreur lors de l\'envoi du code. Veuillez réessayer.');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Veuillez entrer le code de vérification à 6 chiffres');
      return;
    }
    
    setIsSendingCode(true);
    setError('');
    
    try {
      const result = await verifyPhoneOTP(confirmResult, verificationCode);
      
      if (result.success) {
        setIsVerified(true);
        onSuccess(phone); // Pass the verified phone number to parent
      } else {
        setError(result.error || 'Code de vérification incorrect');
      }
    } catch (err) {
      console.error('Error verifying OTP:', err);
      setError('Erreur lors de la vérification du code. Veuillez réessayer.');
    } finally {
      setIsSendingCode(false);
    }
  };

  // Initialize recaptcha
  useEffect(() => {
    // Make sure we have clean recaptcha container
    const recaptchaContainer = document.getElementById('recaptcha-container');
    if (recaptchaContainer) {
      recaptchaContainer.innerHTML = '';
    }
  }, []);

  return (
    <div className="phone-auth-container">
      <h2>Vérification du téléphone</h2>
      {!isVerifying ? (
        <form onSubmit={handleRequestOTP} className="auth-form">
          <div className="form-group">
            <label htmlFor="phone">Numéro de téléphone</label>
            <PhoneInput
              country={'dz'} // Default to Algeria
              value={phone}
              onChange={handlePhoneChange}
              inputProps={{
                name: 'phone',
                required: true,
                autoFocus: true
              }}
              containerClass="phone-input-container"
              inputClass="phone-input"
              buttonClass="country-select"
              dropdownClass="country-dropdown"
              searchClass="country-search"
            />
            <small>Un code de vérification sera envoyé à ce numéro</small>
          </div>
          
          {/* Recaptcha container */}
          <div id="recaptcha-container" className="recaptcha-container"></div>
          
          {error && <div className="error-message">{error}</div>}
          
          <button 
            type="submit" 
            className="auth-button" 
            disabled={isSendingCode || !isPhoneValid()}
          >
            {isSendingCode ? 'Envoi en cours...' : 'Envoyer le code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="auth-form">
          <div className="form-group">
            <label htmlFor="verificationCode">Code de vérification</label>
            <input
              type="text"
              id="verificationCode"
              name="verificationCode"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="Entrez le code à 6 chiffres"
              maxLength="6"
              required
            />
            <small>Le code a été envoyé au numéro {phone}</small>
          </div>
          
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-actions">
            <button 
              type="button" 
              className="back-button" 
              onClick={() => setIsVerifying(false)}
              disabled={isSendingCode}
            >
              Changer le numéro
            </button>
            <button 
              type="submit" 
              className="auth-button" 
              disabled={isSendingCode || verificationCode.length !== 6}
            >
              {isSendingCode ? 'Vérification...' : 'Vérifier le code'}
            </button>
          </div>
        </form>
      )}
      
      {isVerified && (
        <div className="success-message">
          Votre numéro de téléphone a été vérifié avec succès
        </div>
      )}
    </div>
  );
};

export default PhoneAuthentication;