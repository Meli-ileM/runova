import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Shield, Key, AlertTriangle, Lock, Users, Database, Globe, Mail, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom'; // Ajout de l'import manquant
import './pol.css'; 
import logo from '../../assets/noback.png';

const Politique = () => {
  const [expandedSections, setExpandedSections] = useState({});

  const toggleSection = (sectionId) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };

  const Section = ({ id, title, icon: Icon, children, isWarning = false }) => {
    const isExpanded = expandedSections[id];
    return (
      <div className={`policy-section ${isWarning ? 'warning-section' : ''}`}>
        <div 
          className="section-header" 
          onClick={() => toggleSection(id)}
          role="button"
          tabIndex={0}
        >
          <div className="section-title">
            <Icon className="section-icon" size={20} />
            <h2>{title}</h2>
          </div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
        {isExpanded && (
          <div className="section-content">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="privacy-policy-page">
      {/* Header avec branding */}
      <header className="policy-header">
        <div className="header-content">
          <div className="logo-section">
          <img src={logo} alt="RUNOVA" className="auth-logo" />
            <div className="header-text">
              <h1>Politique de Confidentialité</h1>
              <p className="tagline">Transparence totale sur la protection de vos données</p>
            </div>
          </div>
        </div>
      </header>

      <main className="policy-main">
        <div className="container">
          {/* Alert critique sur les conséquences du changement de mot de passe */}
          {/* <div className="critical-warning">
            <AlertTriangle className="warning-icon" size={24} />
            <div className="warning-content">
              <h3>⚠️ ATTENTION CRITIQUE : Changement de Mot de Passe</h3>
              <p>
                <strong>Changer votre mot de passe entraînera la perte DÉFINITIVE de toutes vos données précédentes.</strong>
                Ceci inclut tous vos messages, contacts et historiques de conversation. Cette action est irréversible car 
                nous devrons générer de nouvelles clés cryptographiques et tout le processus de partage de clés 
                devra être refait avec vos contacts.
              </p>
            </div>
          </div> */}

          {/* Introduction */}
          <div className="intro-section">
            <h2>Bienvenue sur la Politique de Confidentialité de RUNOVA</h2>
            <p>
              En tant que service de messagerie sécurisé 100% algérien, nous nous engageons à protéger 
              vos données avec la plus haute sécurité. Cette politique détaille nos pratiques de protection 
              des données et vos droits.
            </p>
            <div className="last-updated">
              <small>Dernière mise à jour : Juin 2025</small>
            </div>
          </div>

          {/* Sections extensibles */}
          <div className="sections-container">
            <Section id="data-collection" title="Collecte des Informations" icon={Database}>
              <h3>Informations que nous collectons</h3>
              <p>Pour créer un compte RUNOVA, nous collectons :</p>
              <ul>
                <li><strong>Informations personnelles :</strong> Nom, prénom, date de naissance</li>
                <li><strong>Coordonnées :</strong> Adresse email valide</li>
                <li><strong>Cryptographie :</strong> Paire de clés générée localement sur votre appareil</li>
              </ul>
              
              <h3>Données de connexion et sécurité</h3>
              <p>Nous enregistrons automatiquement :</p>
              <ul>
                <li>Dates et heures de connexion</li>
                <li>Tentatives de connexion (réussies et échouées)</li>
              </ul>
            </Section>

            <Section id="data-usage" title="Utilisation des Informations" icon={Globe}>
              <p>Vos informations sont utilisées exclusivement pour :</p>
              <ul>
                <li><strong>Fourniture du service :</strong> Maintenir et améliorer RUNOVA</li>
                <li><strong>Sécurité :</strong> Détecter et prévenir les fraudes et abus</li>
                <li><strong>Support :</strong> Vous contacter pour des raisons administratives</li>
              </ul>
            </Section>

            <Section id="encryption" title="Chiffrement et Sécurité" icon={Lock}>
              <h3>Chiffrement Hybride de Bout en Bout</h3>
              <p>RUNOVA utilise un système de chiffrement hybride révolutionnaire :</p>
              
              <div className="encryption-process">
                <div className="step">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <strong>Génération des clés :</strong> Une paire de clés cryptographiques est générée localement sur votre appareil lors de la création du compte
                  </div>
                </div>
                
                <div className="step">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <strong>Partage sécurisé :</strong> Votre clé publique n'est partagée qu'avec vos contacts autorisés
                  </div>
                </div>
                
                <div className="step">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <strong>Chiffrement des messages :</strong> Chaque message utilise une clé  unique
                  </div>
                </div>
                
                <div className="step">
                  <div className="step-number">4</div>
                  <div className="step-content">
                    <strong>Déchiffrement :</strong> Seul vous pouvez déchiffrer vos messages 
                  </div>
                </div>
              </div>

              <h3>Sécurité des serveurs</h3>
              <p>Nos serveurs sont situés en Algérie et protégés par des mesures de sécurité physiques et logicielles conformes aux standards internationaux les plus élevés.</p>
            </Section>

            <Section id="password-consequences" title="Conséquences du Changement de Mot de Passe" icon={Key} isWarning={true}>
              <div className="warning-box">
                <h3>⚠️ PERTE DÉFINITIVE DES DONNÉES</h3>
                <p><strong>Changer votre mot de passe entraîne des conséquences IRRÉVERSIBLES :</strong></p>
                
                <ul className="consequences-list">
                  <li><strong>Perte totale de votre clé privée</strong></li>
                  <li><strong>Génération de nouvelles clés cryptographiques</strong></li>
                  <li><strong>Nécessité de refaire le partage de clés avec tous vos contacts</strong></li>
                  <li><strong>Impossibilité de récupérer et de les déchiffrer les données précédentes</strong></li>
                </ul>
                
                <div className="process-explanation">
                  <h4>Pourquoi cette perte est-elle inévitable ?</h4>
                  <p>
                    Votre mot de passe est utilisé pour chiffrer vos clés cryptographiques surtout votre clé privée. Un nouveau mot de passe 
                    rends  le déchiffrement des données précédentes impossible . Nous ne pouvons pas vous aider à récupérer vos données précédentes et pour resoudre cela le système vous génère de nouvelles clés, .
                    Cette sécurité maximale garantit qu'aucune entité, y compris RUNOVA, ne peut accéder à vos données.
                  </p>
                </div>
                
                <div className="recovery-process">
                  <h4>Processus après changement de mot de passe :</h4>
                  <ol>
                    <li>Génération automatique de nouvelles clés cryptographiques</li>
                    <li>Réinitialisation complète de votre compte</li>
                    <li>Nécessité de rajouter tous vos contacts</li>
                    <li>Nouveau partage de clés avec chaque contact</li>
                  </ol>
                </div>
              </div>
            </Section>

            <Section id="data-sharing" title="Partage des Informations" icon={Users}>
              <p><strong>Nous ne partageons, ne vendons ni ne louons JAMAIS vos informations personnelles</strong>, sauf dans les cas suivants :</p>
              <ul>
                <li>Si requis par la loi algérienne en vigueur</li>
                <li>Pour répondre à des demandes judiciaires valides et officielles</li>
                <li>Pour protéger nos droits ou la sécurité de nos utilisateurs</li>
                <li>En cas de fusion ou acquisition (avec notification préalable)</li>
              </ul>
              
              <div className="guarantee-box">
                <h4>🛡️ Notre Garantie</h4>
                <p>
                  RUNOVA s'engage à ne jamais commercialiser vos données personnelles. 
                  Votre vie privée n'est pas à vendre.
                </p>
              </div>
            </Section>

            <Section id="user-rights" title="Vos Droits" icon={Shield}>
              <p>Conformément à la loi algérienne n°18-07 du 10 juin 2018, vous disposez des droits suivants :</p>
              
              <div className="rights-grid">
                <div className="right-item">
                  <strong>Droit d'accès</strong>
                  <p>Consulter toutes vos données personnelles</p>
                </div>
                
                <div className="right-item">
                  <strong>Droit de rectification</strong>
                  <p>Corriger vos informations inexactes</p>
                </div>
                
                <div className="right-item">
                  <strong>Droit à l'effacement</strong>
                  <p>Supprimer définitivement votre compte et données</p>
                </div>
                
                <div className="right-item">
                  <strong>Droit d'opposition</strong>
                  <p>Vous opposer au traitement de vos données</p>
                </div>
                
                <div className="right-item">
                  <strong>Droit à la limitation</strong>
                  <p>Limiter le traitement de vos données</p>
                </div>
                
                <div className="right-item">
                  <strong>Droit à la portabilité</strong>
                  <p>Récupérer vos données dans un format utilisable</p>
                </div>
              </div>
            </Section>

            <Section id="responsibilities" title="Responsabilités de l'Utilisateur" icon={AlertTriangle}>
              <p>En utilisant RUNOVA, vous vous engagez à :</p>
              <ul>
                <li><strong>Respect de la loi :</strong> Ne pas utiliser le service à des fins illégales</li>
                <li><strong>Sécurité :</strong> Protéger vos identifiants et votre clé privée</li>
                <li><strong>Intégrité :</strong> Ne pas tenter de contourner les mesures de sécurité</li>
                <li><strong>Respect d'autrui :</strong> Ne pas envoyer de contenu diffamatoire ou injurieux</li>
                <li><strong>Conformité :</strong> Respecter les lois algériennes en vigueur</li>
              </ul>
            </Section>

            <Section id="contact" title="Nous Contacter" icon={Mail}>
              <div className="contact-info">
                <div className="contact-item">
                  <Mail className="contact-icon" size={18} />
                  <div>
                    <strong>Email :</strong> privacy@runova.dz
                  </div>
                </div>
                
                <div className="contact-item">
                  <MapPin className="contact-icon" size={18} />
                  <div>
                    <strong>Adresse :</strong><br />
                    RUNOVA Technologies<br />
                    Ouled Moussa, Boumerdes<br />
                    Algérie
                  </div>
                </div>
              </div>
              
              <p>
                Pour toute question concernant cette politique de confidentialité ou vos données personnelles, 
                n'hésitez pas à nous contacter. Nous nous engageons à répondre dans les 48 heures.
              </p>
            </Section>
          </div>

          {/* Section d'acceptation */}
          <div className="acceptance-section">
            <h3>Acceptation des Conditions</h3>
            <p>
              En utilisant RUNOVA, vous reconnaissez avoir lu, compris et accepté cette Politique de Confidentialité. 
              Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser notre service.
            </p>
            <div className="action-buttons">
              <Link to="/register" className="btn-primary">
                Créer un compte
              </Link>
              <Link to="/login" className="btn-secondary">
                Se connecter
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="policy-footer">
        <div className="container">
          <p>&copy; 2025 RUNOVA Technologies. Tous droits réservés.</p>
          <p>Service de messagerie sécurisé made in Algeria 🇩🇿</p>
        </div>
      </footer>

    </div>
  );
};

export default Politique;