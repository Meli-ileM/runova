import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/home/home.jsx';
import Login from './pages/auth/login.jsx';
import Register from './pages/auth/register.jsx';
import Index from './pages/inbox/index.jsx';
import Profile from './pages/profile/profile.jsx';
import { CallProvider } from './components/CallContext.jsx';
import Meet from './pages/meet/Meet.jsx';
import ForgotPassword from './pages/auth/ForgotPassword.jsx';
import CallPage from './pages/meet/CallPage.jsx';
import GererLabel from './components/gererLabel.jsx'; // ou le bon chemin
import Contacts from './pages/contact/contact.jsx';
import Politique from './pages/auth/politique.jsx';



function App() {
  // utils pour récupérer l'utilisateur
  function getCurrentUser() {
    const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    console.log("Retrieved user data:", userData); // Debug log
    return userData ? JSON.parse(userData) : null;
  }

  // Récupération immédiate
  const currentUser = getCurrentUser();
  console.log("Current user:", currentUser); // Debug log
  console.log("User ID:", currentUser?.id);
  return (

    <Router>
    <CallProvider 
      userId={currentUser?.id} 
      username={currentUser?.FirstName} // ou firstName/lastName selon votre modèle
    >
    
      <Routes>
        {/* Redirection vers /home si on est sur / */}
        <Route path="/" element={<Navigate to="/login" />} />
        {/* Page d'accueil */}
        <Route path="/home" element={<Home />} />
        <Route path="/terms" element={<Politique />} />
        <Route path='/home' element={Home}/>
        {/* Page de connexion */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/index" element={<Index />} />
        <Route path="/profile" element={<Profile />}/>
        <Route path="/call/:roomId" element={<CallPage />} />
       <Route path="/meet" element={<Meet />} />
       <Route path="/ForgotPassword" element={<ForgotPassword />} />
       <Route path="/rooms/join/:roomID" element={<CallPage />} />
       <Route path="/contacts" element={<Contacts />} />
       <Route path="/labels" element={<GererLabel />} />

      </Routes>
      </CallProvider>

    </Router>
  );
}

export default App;

