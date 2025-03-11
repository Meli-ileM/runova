import React from 'react';
import { useNavigate } from 'react-router-dom';
import '../home/home.css';
import logo from '../../assets/logo.png';
import logo2 from '../../assets/LOOGOO.png';

const Home = () => {
  const navigate = useNavigate();
  return (
    <div className="app-containerhome">
      <header className="app-header">
        <nav className="navbar">
          <img src={logo} alt="RUNOVA" className="logo" />
          <div className="auth-buttons">
          
          </div>
        </nav>
      </header>

      <main className="main-content">
        <section className="hero">
          <div className="hero-content">
            <h1>Les runes gardaient les mystères des rois.</h1>
            <h2>Maintenant, les vôtres.</h2>
            <p>Messagerie sécurisée avec chiffrement de bout en bout. Architecture à connaissance zéro. Confidentialité totale pour vos communications les plus importantes.</p>
          </div>
        </section>

        <section className="features">
          <h1>Fonctionnalités Clés</h1>
          <div className="feature-cards">
            <div className="feature-card">
              <h3>Chiffrement de Bout en Bout</h3>
              <p>Tous vos messages sont chiffrés sur votre appareil et ne peuvent être déchiffrés que par le destinataire prévu, garantissant une confidentialité absolue.</p>
            </div>
            <div className="feature-card">
              <h3>Sans Collection de Données</h3>
              <p>Aucune métadonnée n'est collectée ou stockée concernant vos communications. Votre vie privée reste intacte.</p>
            </div>
            <div className="feature-card">
              <h3>Partage de Fichiers Sécurisé</h3>
              <p>Partagez documents, images et vidéos avec le même niveau de chiffrement que vos messages, en toute sécurité.</p>
            </div>
          </div>
        </section>

        <section id="about" className="about">
          <h2>L'origine de RUNOVA</h2>
          <div className="about-content">
            <div className="about-text">
              <p><h3 className="highlight">RÚN (ᚱᚢᚾ)</h3> Inspiré des runes nordiques, symboles anciens utilisés par les Vikings pour transmettre des messages secrets et mystérieux.</p>
              <p><h4 className="highlight">NOVA</h4> Du latin signifiant "nouveau". Une nova est une étoile qui s'illumine soudainement, symbolisant une nouvelle ère ou une révélation majeure.</p>
              <p><h3 className="highlight">RUNOVA </h3>Signifie littéralement "Nouvelle Rune", alliant la sagesse et la sécurité des runes anciennes à l'innovation technologique moderne pour protéger vos communications comme jamais auparavant.</p>
            </div>
          </div>
        </section>
        <footer className="app-footer">
          <div className="footer-cta">
            <img src={logo2} alt="RUNOVA" className="footer-logo" />
            <h2>Prêt à sécuriser vos communications ?</h2>
            <p>Rejoignez les milliers d'utilisateurs qui ont déjà fait confiance à RUNOVA pour protéger leurs conversations les plus importantes. Notre technologie de chiffrement avancée garantit que vos messages ne sont lus que par vous et vos destinataires.</p>
          </div>
        

          <div className="copyright">
              © {new Date().getFullYear()} RUNOVA. Tous droits réservés.
            </div>
        </footer>
      </main>
    </div>
  );
}

export default Home;