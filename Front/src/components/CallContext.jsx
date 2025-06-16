import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
window.global = window;
import Peer from 'simple-peer';

const CallContext = createContext();

export const useCall = () => {
  return useContext(CallContext);
};

export const CallProvider = ({ children, userId, username }) => {
  const [callState, setCallState] = useState({
    receivingCall: false,
    callAccepted: false,
    callEnded: false,
    caller: null,
    callerName: '',
    callerSignal: null,
    callRoomId: null,
  });
  
  const [stream, setStream] = useState(null);
  const [peerConnections, setPeerConnections] = useState({});
  const [usersInRoom, setUsersInRoom] = useState([]);
  const [currentRoomId, setCurrentRoomId] = useState(null);
  const [mediaError, setMediaError] = useState(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  
  const socketRef = useRef();
  const myVideoRef = useRef();
  
  // Initialisation de la connexion Socket.io
  useEffect(() => {
    socketRef.current = io('https://runova.onrender.com');
    

    // Écouter les refus d'appel
    socketRef.current.on('call-rejected', () => {
      console.log('Call rejected');
      setCallState(prev => ({
        ...prev,
        receivingCall: false
      }));
    });
    
    // Écouter quand un nouvel utilisateur rejoint la room
    socketRef.current.on('user-joined', ({ signal, callerID }) => {
      console.log('New user joined with ID:', callerID);
      
      if (!stream) {
        console.warn('No local stream when user joined');
        return;
      }
      
      const peer = addPeer(signal, callerID, stream);
      
      setPeerConnections(prevConnections => ({
        ...prevConnections,
        [callerID]: peer
      }));
    });
    
    // Recevoir le signal retourné d'un pair
    socketRef.current.on('receiving-returned-signal', ({ signal, id }) => {
      console.log('Received returned signal from', id);
      if (peerConnections[id]) {
        peerConnections[id].signal(signal);
      }
    });
    
    // Recevoir la liste des utilisateurs dans la room
    socketRef.current.on('all-users', users => {
      console.log('All users in room:', users);
      setUsersInRoom(users);
      
      if (!stream) {
        console.warn('No local stream when receiving all-users');
        return;
      }
      
      const newPeers = {};
      
      users.forEach(user => {
        console.log('Creating peer for user', user.socketId);
        const peer = createPeer(user.socketId, socketRef.current.id, stream);
        newPeers[user.socketId] = peer;
      });
      
      setPeerConnections(prevConnections => ({
        ...prevConnections,
        ...newPeers
      }));
    });
    
    // Gérer le départ d'un utilisateur
    socketRef.current.on('user-left', id => {
      console.log('User left:', id);
      if (peerConnections[id]) {
        peerConnections[id].destroy();
        
        setPeerConnections(prevConnections => {
          const connections = { ...prevConnections };
          delete connections[id];
          return connections;
        });
      }
    });
    
    return () => {
      socketRef.current.disconnect();
      Object.values(peerConnections).forEach(peer => {
        if (peer) peer.destroy();
      });
      
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);
  
  // Mettre à jour les connexions peer quand le stream change
  useEffect(() => {
    if (stream && currentRoomId) {
      console.log('Stream changed, joining room', currentRoomId);
      socketRef.current.emit('join-room', { 
        roomID: currentRoomId, 
        userID: userId 
      });
    }
  }, [stream, currentRoomId]);
  
  // Vérifier la disponibilité des périphériques média
  const checkMediaDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      const audioDevices = devices.filter(device => device.kind === 'audioinput');
      
      if (videoDevices.length === 0) {
        console.warn('No video devices detected');
        return { hasVideo: false, hasAudio: audioDevices.length > 0 };
      }
      
      return { hasVideo: true, hasAudio: audioDevices.length > 0 };
    } catch (error) {
      console.error('Error checking media devices:', error);
      return { hasVideo: false, hasAudio: false };
    }
  };
  
  // Fonction pour créer une connexion peer (initiateur)
  const createPeer = (userToSignal, callerID, stream) => {
    console.log('Creating peer connection as initiator to', userToSignal);
    const peer = new Peer({
      initiator: true,
      trickle: false,
      stream: stream
    });
    
    peer.on('signal', signal => {
      console.log('Signaling to', userToSignal);
      socketRef.current.emit('sending-signal', { 
        userToSignal, 
        callerID, 
        signal 
      });
    });
    
    return peer;
  };
  
  // Fonction pour ajouter une connexion peer (récepteur)
  const addPeer = (incomingSignal, callerID, stream) => {
    console.log('Adding peer connection as receiver from', callerID);
    const peer = new Peer({
      initiator: false,
      trickle: false,
      stream
    });
    
    peer.on('signal', signal => {
      console.log('Returning signal to', callerID);
      socketRef.current.emit('returning-signal', { 
        signal, 
        callerID 
      });
    });
    
    peer.signal(incomingSignal);
    
    return peer;
  };
  
  // Initialiser le media stream
  const initMediaStream = async () => {
    // Réinitialiser les états d'erreur
    setMediaError(null);
    setIsAudioOnly(false);
    
    // Vérifier les périphériques disponibles
    const { hasVideo, hasAudio } = await checkMediaDevices();
    
    try {
      console.log('Initializing media stream');
      const constraints = {
        video: hasVideo,
        audio: hasAudio
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      setStream(mediaStream);
      
      if (myVideoRef.current) {
        myVideoRef.current.srcObject = mediaStream;
      }
      
      return mediaStream;
    } catch (error) {
      console.error("Erreur d'accès aux périphériques média:", error);
      setMediaError(error.name);
      
      // Si l'erreur est liée à la vidéo, essayer en mode audio uniquement
      if (error.name === "NotReadableError" || error.name === "NotAllowedError") {
        try {
          console.log('Attempting audio-only fallback');
          const audioOnlyStream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true
          });
          
          setStream(audioOnlyStream);
          setIsAudioOnly(true);
          
          return audioOnlyStream;
        } catch (audioError) {
          console.error("Audio fallback also failed:", audioError);
          setMediaError(`${error.name} (audio fallback also failed)`);
          return null;
        }
      }
      
      return null;
    }
  };
  
  // Tenter de réinitialiser la caméra
  const resetCamera = async () => {
    // Arrêter tous les tracks actuels
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    // Réinitialiser le stream
    setStream(null);
    
    // Tenter de réinitialiser
    return await initMediaStream();
  };
  
  // Joindre une room d'appel
  const joinRoom = async (roomID) => {
    console.log('Joining room', roomID);
    setCurrentRoomId(roomID);
    
    if (!stream) {
      console.log('No stream available, initializing...');
      const mediaStream = await initMediaStream();
      if (!mediaStream) {
        console.error('Failed to initialize media stream');
        return false;
      }
    }
    
    console.log('Emitting join-room event');
    socketRef.current.emit('join-room', { 
      roomID, 
      userID: userId 
    });
    
    return true;
  };
  
  // Appeler un utilisateur
  const callUser = (userToCall, roomID) => {
    console.log('Calling user', userToCall, 'for room', roomID);
    socketRef.current.emit('call-user', {
      userToCall,
      from: socketRef.current.id,
      name: username,
      roomID
    });
  };
  
  // Accepter un appel
  const acceptCall = async () => {
    console.log('Accepting call from', callState.caller);
    const mediaStream = await initMediaStream();
    if (!mediaStream) {
      console.error('Failed to initialize media stream on call accept');
      return false;
    }
    
    socketRef.current.emit('accept-call', {
      to: callState.caller,
      roomID: callState.callRoomId
    });
    
    setCallState(prev => ({
      ...prev,
      callAccepted: true
    }));
    
    return true;
  };
  
  // Refuser un appel
  const rejectCall = () => {
    console.log('Rejecting call from', callState.caller);
    socketRef.current.emit('reject-call', {
      to: callState.caller
    });
    
    setCallState(prev => ({
      ...prev,
      receivingCall: false
    }));
  };
  
  // Terminer un appel
  const endCall = () => {
    console.log('Ending call');
    // Arrêter tous les tracks média
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    
    // Détruire toutes les connexions peer
    Object.values(peerConnections).forEach(peer => {
      if (peer) peer.destroy();
    });
    
    setPeerConnections({});
    
    // Réinitialiser l'état
    setCallState({
      receivingCall: false,
      callAccepted: false,
      callEnded: true,
      caller: null,
      callerName: '',
      callerSignal: null,
      callRoomId: null
    });
    
    setCurrentRoomId(null);
    setStream(null);
    setMediaError(null);
    setIsAudioOnly(false);
  };
  
  // Activer/désactiver la vidéo
  const toggleVideo = () => {
    if (stream) {
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        return true;
      }
      return false;
    }
    return false;
  };
  
  // Activer/désactiver l'audio
  const toggleAudio = () => {
    if (stream) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks.forEach(track => {
          track.enabled = !track.enabled;
        });
        return true;
      }
      return false;
    }
    return false;
  };
  
  const value = {
    callState,
    stream,
    myVideoRef,
    peerConnections,
    usersInRoom,
    currentRoomId,
    mediaError,
    isAudioOnly,
    initMediaStream,
    resetCamera,
    joinRoom,
    callUser,
    acceptCall,
    rejectCall,
    endCall,
    toggleVideo,
    toggleAudio
  };
  
  return (
    <CallContext.Provider value={value}>
      {children}
    </CallContext.Provider>
  );
};