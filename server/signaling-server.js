const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

// Ajoutez cette route GET pour la racine
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'running',
    service: 'WebRTC Signaling Server',
    activeConnections: Object.keys(io.sockets.sockets).length,
    activeRooms: Object.keys(users).length
  });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Stocker les utilisateurs connectés
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
  
  // Notification d'appel entrant
  socket.on('call-user', ({ userToCall, from, roomID, name }) => {
    io.to(userToCall).emit('call-incoming', {
      signal: null,
      from,
      name,
      roomID
    });
  });
  
  // Acceptation d'appel
  socket.on('accept-call', ({ to, roomID }) => {
    io.to(to).emit('call-accepted', { roomID });
  });
  
  // Refuser l'appel
  socket.on('reject-call', ({ to }) => {
    io.to(to).emit('call-rejected');
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
        
        // Notifier les autres utilisateurs
        room.forEach(user => {
          io.to(user.socketId).emit('user-left', socket.id);
        });
      }
    }
    
    delete socketToRoom[socket.id];
  });
});

const PORT =  5001;
server.listen(PORT, () => {
  console.log(`Signaling server running on port ${PORT}`);
});