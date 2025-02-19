const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');
require('./models/Label');
require('./models/User');
require('./models/Thread');
require('./models/Email');
const userRoutes = require('./routes/UserRoutes');
const emailRoutes = require('./routes/EmailRoutes');
const threadRoutes = require('./routes/threadRoutes');
const http = require('http');
const { Server } = require('socket.io');
const roomsRoutes = require('./routes/rooms-routes');
// Ajouter cette ligne avec les autres require
const keyRoutes = require('./routes/KeyRoutes');
const contactRoutes = require('./routes/contactRoutes');
const labelRoutes = require('./routes/labelRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const session = require('express-session');
const MongoStore = require('connect-mongo');



// Ajouter cette ligne avec les autres app.use
// Charger les variables d'environnement du fichier .env
dotenv.config();

// Initialisation de l'application Express
const app = express();

// Middleware pour parser les requêtes JSON et urlencoded
app.use(express.json({ limit: '50gb' }));
app.use(express.urlencoded({ extended: true, limit: '50gb' }));

// Configuration de CORS
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173','https://runovaproject.onrender.com','https://runovaproject.onrender.com'], // URLs de votre frontend React
  credentials: true // Permet l'envoi de cookies
}));
app.use(session({
  secret: process.env.SESSION_SECRET || 'runova-session-secret',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({ 
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60 // Durée de vie de la session en secondes (ici 1 jour)
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production', // true en production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 jour en millisecondes
  }
}));

// Middleware pour parser les cookies
app.use(cookieParser());

// Servir les fichiers statiques (uploads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', userRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/threads', threadRoutes);
app.use('/api/rooms', roomsRoutes); // Route pour les rooms de vidéoconférence
app.use('/api/contacts', contactRoutes);
app.use('/api/labels', labelRoutes);
app.use('/api/notifications',notificationRoutes);

// Ajouter cette ligne avec les autres app.use
app.use('/api/keys', keyRoutes);
// Route de test
app.get('/', (req, res) => {
  res.send('API RUNOVA en ligne');
});

// Création du serveur HTTP
const server = http.createServer(app);

// Configuration de Socket.io avec support CORS
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173', 'https://runovaproject.onrender.com','https://runovaproject.onrender.com'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Stocker les utilisateurs connectés (intégration de signaling-server.js)
const users = {};
const socketToRoom = {};

io.on('connection', socket => {
  console.log(`User connected: ${socket.id}`);
  
  // Quand un utilisateur rejoint une room
  socket.on('join-room', ({ roomID, userID }) => {
    console.log(`User ${userID} joining room ${roomID}`);
    
    // Ajouter l'utilisateur à la room
    if (users[roomID]) {
      users[roomID].push({ socketId: socket.id, userID });
    } else {
      users[roomID] = [{ socketId: socket.id, userID }];
    }
    
    socketToRoom[socket.id] = roomID;
    
    // Faire rejoindre le socket à la room Socket.io (pour les messages ciblés)
    socket.join(roomID);
    
    // Informer les autres utilisateurs dans la room
    const usersInThisRoom = users[roomID].filter(user => user.socketId !== socket.id);
    socket.emit('all-users', usersInThisRoom);
  });
  
  // Gestion des offres WebRTC
  socket.on('sending-signal', payload => {
    io.to(payload.userToSignal).emit('user-joined', { 
      signal: payload.signal, 
      callerID: payload.callerID 
    });
  });
  
  // Gestion des réponses WebRTC
  socket.on('returning-signal', payload => {
    io.to(payload.callerID).emit('receiving-returned-signal', { 
      signal: payload.signal, 
      id: socket.id 
    });
  });
  
 
  // Messages chat dans une room
  socket.on('send-message', ({ roomID, message, sender }) => {
    io.to(roomID).emit('new-message', {
      message,
      sender,
      timestamp: new Date()
    });
  });
  
  // Partage d'écran
  socket.on('screen-share-started', ({ roomID, userID }) => {
    socket.to(roomID).emit('user-screen-share', { userID, isSharing: true });
  });
  
  socket.on('screen-share-stopped', ({ roomID, userID }) => {
    socket.to(roomID).emit('user-screen-share', { userID, isSharing: false });
  });
  
  // Gestion de la déconnexion
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    const roomID = socketToRoom[socket.id];
    
    if (roomID) {
      let room = users[roomID];
      if (room) {
        room = room.filter(user => user.socketId !== socket.id);
        users[roomID] = room;
        
        // Si la room est vide, la supprimer
        if (room.length === 0) {
          delete users[roomID];
        } else {
          // Notifier les autres utilisateurs
          room.forEach(user => {
            io.to(user.socketId).emit('user-left', socket.id);
          });
        }
      }
      
      // Quitter la room Socket.io
      socket.leave(roomID);
    }
    
    delete socketToRoom[socket.id];
  });
});

// Middleware global pour capturer les erreurs
app.use((err, req, res, next) => {
  console.error('Erreur globale:', err.stack);
  res.status(err.status || 500).json({
    status: 'error',
    message: err.message || 'Erreur serveur interne'
  });
});

// Gestion des routes non trouvées
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Route non trouvée'
  });
});

// Connexion à MongoDB avec les variables d'environnement
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  tls: true,
  tlsAllowInvalidCertificates: false
})
.then(() => console.log('Connecté à MongoDB Atlas'))
.catch(err => console.error('Erreur de connexion à MongoDB:', err));

// Définition du port depuis les variables d'environnement
const PORT = process.env.PORT || 5000;

// Démarrage du serveur HTTP (qui contient à la fois l'app Express et Socket.io)
server.listen(PORT, () => {
  console.log(`Serveur RUNOVA en cours d'exécution sur le port ${PORT}`);
});

module.exports = app;