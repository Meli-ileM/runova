const { v4: uuidv4 } = require('uuid');
const Email = require('../models/Email');
const User = require('../models/User');
const mongoose = require('mongoose');
const { encodeEmailKey } = require('../utils/emailKey');

// Stockage des rooms (en production, utilisez une base de données)
const activeRooms = new Map();

// Fonction pour obtenir une instance de Socket.io
// Cette fonction devrait être appelée après l'initialisation de Socket.io dans server.js
let io;
exports.setSocketIO = (socketIO) => {
  io = socketIO;
};

// Créer une nouvelle room
exports.createRoom = (req, res) => {
  const roomID = uuidv4();
  
  // L'utilisateur est disponible via req.user grâce au middleware
  const userId = req.user._id;  // MongoDB stocke l'ID sous la forme _id
  
  activeRooms.set(roomID, {
    id: roomID,
    createdBy: userId.toString(), // Convertir en string si nécessaire
    participants: [userId.toString()], // Le créateur est le premier participant
    createdAt: new Date(),
    activeUsers: [] // Pour suivre les utilisateurs actuellement actifs dans la room
  });
  
  res.status(201).json({ roomID });
};

exports.notifyParticipants = async (req, res) => {
  try {
    const { roomID, participants } = req.body;
    const userId = req.user._id;  // MongoDB stocke l'ID sous la forme _id
    
    if (!roomID || !participants || !Array.isArray(participants)) {
      return res.status(400).json({ message: "Données invalides pour la notification" });
    }

    // Vérifiez si la salle existe dans la Map
    if (!activeRooms.has(roomID)) {
      return res.status(404).json({ message: "Salle non trouvée" });
    }

    const room = activeRooms.get(roomID);
    const organizer = await User.findById(userId);
    
    if (!organizer) {
      return res.status(404).json({ message: "Organisateur non trouvé" });
    }

    // Modifier l'URL pour utiliser le bon protocole et domaine en production
    const baseUrl = process.env.NODE_ENV === 'production' 
      ? process.env.FRONT_URL || 'https://votre-domaine.com'
      : 'http://localhost:5173'; // URL frontend (port 5173 d'après server.js)
    
    // Créer un nouvel email pour chaque participant
    const emailPromises = participants.map(async (participantEmail) => {
      // Rechercher l'utilisateur correspondant à cet email
      const participant = await User.findOne({ email: participantEmail });
      
      if (!participant) {
        console.log(`Utilisateur avec l'email ${participantEmail} non trouvé`);
        return null;
      }
      
      // Créer l'email avec le lien frontend
      const meetingLink = `${baseUrl}/rooms/join/${roomID}`;
      const subject = `Invitation à rejoindre une réunion`;
      const body = `
        <p>Bonjour,</p>
        <p>${organizer.name || organizer.email} vous invite à rejoindre une réunion.</p>
        <p>Pour rejoindre la réunion, veuillez cliquer sur le lien suivant: <a href="${meetingLink}">${meetingLink}</a></p>
        <p>À bientôt!</p>
      `;
      
      // Créer l'objet email
      const email = new Email({
        threadId: new mongoose.Types.ObjectId(),
        sender: {
          userId: userId,
          email: organizer.email,
          name: organizer.name || ""
        },
        subject,
        body,
        isDraft: false,
        recipients: {
          to: [{
            userId: participant._id,
            email: participantEmail,
            name: participant.name || "",
            isRead: false
          }],
          cc: [],
          bcc: []
        }
      });
      
      // Initialiser userEmailStatus
      email.userEmailStatus = new Map();
      email.userEmailStatus.set(encodeEmailKey(organizer.email), {});
      email.userEmailStatus.set(encodeEmailKey(participantEmail), {});
      
      return email.save();
    });
    
    // Attendre que tous les emails soient envoyés
    const emails = await Promise.all(emailPromises);
    
    // Mettre à jour la liste des participants dans la room
    const participantIds = await User.find({ email: { $in: participants } })
      .distinct('_id')
      .then(ids => ids.map(id => id.toString()));
    
    // Ajouter les nouveaux participants à la room
    room.participants = [...new Set([...room.participants, ...participantIds])];
    activeRooms.set(roomID, room);
    
    // Notifier les participants déjà connectés à la room via Socket.io
    if (io) {
      io.to(roomID).emit('participants-updated', {
        roomID,
        participants: room.participants
      });
    }
    
    res.status(200).json({ 
      message: "Invitations envoyées avec succès",
      invitedCount: emails.filter(Boolean).length
    });
  } catch (error) {
    console.error("Erreur lors de l'envoi des notifications:", error);
    res.status(500).json({ message: "Erreur lors de l'envoi des notifications", error: error.message });
  }
};

// Rejoindre une room existante
exports.joinRoom = (req, res) => {
  try {
    const { roomID } = req.body;
    // Récupérer l'ID de l'utilisateur connecté depuis req.user
    const userId = req.user._id.toString();  // MongoDB stocke l'ID sous la forme _id
    
    if (!roomID) {
      return res.status(400).json({ status: "error", message: "roomID est requis" });
    }
    
    if (!activeRooms.has(roomID)) {
      return res.status(404).json({ status: "error", message: "Salle non trouvée" });
    }
    
    const room = activeRooms.get(roomID);
    
    // Vérifier si l'utilisateur est autorisé à rejoindre la room
    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      activeRooms.set(roomID, room);
    }
    
    // Récupérer les informations de l'utilisateur pour les envoyer aux autres participants
    User.findById(userId)
      .select('name email avatar')
      .then(user => {
        if (io) {
          // Notifier les autres participants qu'un nouvel utilisateur a rejoint la room
          io.to(roomID).emit('user-joined-room', {
            userId,
            name: user.name || user.email,
            avatar: user.avatar || null
          });
        }
      })
      .catch(err => {
        console.error("Erreur lors de la récupération des informations utilisateur:", err);
      });
    
    res.status(200).json({ status: "success", room });
  } catch (error) {
    console.error("Erreur lors de la jonction à la salle:", error);
    res.status(500).json({ status: "error", message: "Erreur serveur lors de la jonction à la salle" });
  }
};

// Nouvelle méthode pour gérer les liens d'invitation GET
exports.getRoomJoinPage = (req, res) => {
  const { roomID } = req.params;
  
  if (!activeRooms.has(roomID)) {
    return res.status(404).json({ status: "error", message: "Salle non trouvée" });
  }
  
  // Rediriger vers l'interface frontend avec l'ID de la salle
  const frontendUrl = process.env.NODE_ENV === 'production' 
  ? `${process.env.FRONT_URL}/rooms/join/${roomID}`  // Utilisez le même chemin partout
  : `http://localhost:5173/rooms/join/${roomID}`;
  
  res.redirect(frontendUrl);
};

// Rejoindre une room avec le lien d'invitation (POST)
exports.joinRoomByLink = async (req, res) => {
  try {
    const { roomID } = req.params;
    const userId = req.user._id.toString();

    if (!roomID) {
      return res.status(400).json({ status: "error", message: "roomID est requis" });
    }

    if (!activeRooms.has(roomID)) {
      return res.status(404).json({ status: "error", message: "Salle non trouvée" });
    }

    const room = activeRooms.get(roomID);

    // Ajouter l'utilisateur aux participants s'il n'y est pas déjà
    if (!room.participants.includes(userId)) {
      room.participants.push(userId);
      activeRooms.set(roomID, room);
      
      // Récupérer les informations de l'utilisateur
      const user = await User.findById(userId).select('name email avatar');
      
      if (io) {
        // Notifier les autres participants qu'un nouvel utilisateur a rejoint la room
        io.to(roomID).emit('user-joined-room', {
          userId,
          name: user.name || user.email,
          avatar: user.avatar || null
        });
      }
    }

    res.status(200).json({ status: "success", room });
  } catch (error) {
    console.error("Erreur lors de la jonction à la salle par lien:", error);
    res.status(500).json({ status: "error", message: "Erreur serveur" });
  }
};

exports.getRoomInfo = async (req, res) => {
  try {
    const { roomID } = req.params;
    
    if (!activeRooms.has(roomID)) {
      return res.status(404).json({ status: "error", message: "Salle non trouvée" });
    }
    
    const room = activeRooms.get(roomID);
    
    // Si possible, récupérer les noms des participants depuis la base de données
    const participantDetails = await User.find({ 
      _id: { $in: room.participants.map(id => mongoose.Types.ObjectId(id)) } 
    })
    .select('_id name email avatar');
    
    const roomWithDetails = {
      ...room,
      participants: participantDetails.map(p => ({
        id: p._id.toString(),
        name: p.name || p.email,
        email: p.email,
        avatar: p.avatar || null
      }))
    };
    
    res.status(200).json({ status: "success", room: roomWithDetails });
  } catch (error) {
    console.error("Erreur lors de la récupération des infos de la salle:", error);
    res.status(500).json({ status: "error", message: "Erreur serveur" });
  }
};

// Quitter une room
exports.leaveRoom = (req, res) => {
  try {
    const { roomID } = req.params;
    const userId = req.user._id.toString();
    
    if (!activeRooms.has(roomID)) {
      return res.status(404).json({ status: "error", message: "Salle non trouvée" });
    }
    
    const room = activeRooms.get(roomID);
    
    // Supprimer l'utilisateur de la liste des participants
    room.participants = room.participants.filter(id => id !== userId);
    
    // Si la room est vide, la supprimer
    if (room.participants.length === 0) {
      activeRooms.delete(roomID);
      return res.status(200).json({ status: "success", message: "Salle fermée" });
    } else {
      activeRooms.set(roomID, room);
      
      // Notifier les autres participants que l'utilisateur a quitté la room
      if (io) {
        io.to(roomID).emit('user-left-room', { userId });
      }
      
      return res.status(200).json({ status: "success", message: "Salle quittée" });
    }
  } catch (error) {
    console.error("Erreur lors de la sortie de la salle:", error);
    res.status(500).json({ status: "error", message: "Erreur serveur" });
  }
};

// Fonction de nettoyage des rooms inactives (à appeler périodiquement)
exports.cleanupInactiveRooms = () => {
  const now = new Date();
  const maxAgeInHours = 24; // Supprimer les rooms inactives depuis plus de 24h
  
  activeRooms.forEach((room, roomID) => {
    const roomAge = (now - new Date(room.createdAt)) / (1000 * 60 * 60);
    
    if (roomAge > maxAgeInHours) {
      console.log(`Suppression de la room inactive: ${roomID}`);
      activeRooms.delete(roomID);
    }
  });
};