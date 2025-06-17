import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Mic, MicOff, VideoOff, Phone, Share, MessageSquare, UserPlus, Copy, Check } from 'lucide-react';
import io from 'socket.io-client';

const Meet = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [meetingTitle, setMeetingTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [meetingId, setMeetingId] = useState('');
  const [isMeetingCreated, setIsMeetingCreated] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState([]);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const videoRef = useRef(null);
  const socketRef = useRef(null);
  const peerConnections = useRef({});

  // Vérifier l'authentification de l'utilisateur
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await fetch('https://runova.onrender.com/api/auth/profile', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        const userData = await response.json();
        setUser(userData);
        setLoading(false);
      } catch (error) {
        console.error('Erreur d\'authentification:', error);
        setError(error.message);
        setLoading(false);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  // Initialiser la caméra et le microphone
  const initializeMedia = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: isVideoEnabled,
        audio: isAudioEnabled
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setLocalStream(stream);
      return stream;
    } catch (error) {
      console.error('Erreur lors de l\'accès aux périphériques:', error);
      setError('Impossible d\'accéder à la caméra ou au microphone');
      return null;
    }
  };

  // Initialiser la connexion Socket.io et WebRTC
  const initializeCall = async () => {
    const stream = await initializeMedia();
    if (!stream) return;

    socketRef.current = io('https://runova.onrender.com');

    // Rejoindre la room
    socketRef.current.emit('join-room', { 
      roomID: meetingId,
      userID: user._id,
      userName: `${user.firstName} ${user.lastName || ''}`.trim()
    });

    // Gestion des nouveaux participants
    socketRef.current.on('user-joined', ({ userID, userName }) => {
      console.log('Nouveau participant:', userName);
      
      // Créer une nouvelle connexion peer
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Gérer les candidats ICE
      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', {
            candidate: event.candidate,
            to: userID,
            from: user._id
          });
        }
      };

      // Gérer les streams entrants
      peer.ontrack = (event) => {
        setRemoteStreams(prev => ({
          ...prev,
          [userID]: event.streams[0]
        }));
      };

      // Ajouter le stream local
      stream.getTracks().forEach(track => {
        peer.addTrack(track, stream);
      });

      peerConnections.current[userID] = peer;

      // Mettre à jour la liste des participants
      setActiveParticipants(prev => {
        if (!prev.some(p => p.userID === userID)) {
          return [...prev, { userID, userName }];
        }
        return prev;
      });
    });

    // Gestion des participants existants
    socketRef.current.on('existing-users', (users) => {
      console.log('Participants existants:', users);
      setActiveParticipants(users);
    });

    // Gestion des participants qui quittent
    socketRef.current.on('user-left', (userID) => {
      console.log('Participant a quitté:', userID);
      if (peerConnections.current[userID]) {
        peerConnections.current[userID].close();
        delete peerConnections.current[userID];
      }

      setRemoteStreams(prev => {
        const newStreams = { ...prev };
        delete newStreams[userID];
        return newStreams;
      });

      setActiveParticipants(prev => prev.filter(p => p.userID !== userID));
    });

    // Gestion des offres SDP
    socketRef.current.on('offer', async ({ offer, from, userName }) => {
      console.log('Reçu une offre de:', userName);
      
      const peer = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socketRef.current.emit('ice-candidate', {
            candidate: event.candidate,
            to: from,
            from: user._id
          });
        }
      };

      peer.ontrack = (event) => {
        setRemoteStreams(prev => ({
          ...prev,
          [from]: event.streams[0]
        }));
      };

      stream.getTracks().forEach(track => {
        peer.addTrack(track, stream);
      });

      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      socketRef.current.emit('answer', {
        answer,
        to: from
      });

      peerConnections.current[from] = peer;

      setActiveParticipants(prev => {
        if (!prev.some(p => p.userID === from)) {
          return [...prev, { userID: from, userName }];
        }
        return prev;
      });
    });

    // Gestion des réponses SDP
    socketRef.current.on('answer', async ({ answer, from }) => {
      console.log('Reçu une réponse de:', from);
      const peer = peerConnections.current[from];
      if (peer) {
        await peer.setRemoteDescription(new RTCSessionDescription(answer));
      }
    });

    // Gestion des candidats ICE
    socketRef.current.on('ice-candidate', async ({ candidate, from }) => {
      const peer = peerConnections.current[from];
      if (peer && candidate) {
        try {
          await peer.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.error('Erreur avec addIceCandidate:', error);
        }
      }
    });
  };

  // Initialiser l'appel quand la réunion est créée
  useEffect(() => {
    if (isMeetingCreated && meetingId) {
      initializeCall();
    }

    return () => {
      // Nettoyage
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      Object.values(peerConnections.current).forEach(peer => {
        peer.close();
      });

      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isMeetingCreated, meetingId]);

  // Recherche d'utilisateurs par email
  useEffect(() => {
    const searchUsers = async () => {
      if (searchTerm.length < 2) {
        setSearchResults([]);
        return;
      }

      try {
        const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        const response = await fetch(
          `https://runova.onrender.com/api/auth/profile/search?query=${encodeURIComponent(searchTerm)}`, 
          {
            headers: { 
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (!response.ok) throw new Error('Search failed');
        
        const searchData = await response.json();
        const filteredResults = searchData.filter(user => 
          !selectedUsers.some(selected => selected._id === user._id)
        );
        
        setSearchResults(filteredResults);
      } catch (error) {
        console.error('Erreur lors de la recherche:', error);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [searchTerm, selectedUsers]);

  // Gérer la sélection d'un utilisateur
  const handleSelectUser = (user) => {
    setSelectedUsers([...selectedUsers, user]);
    setSearchTerm('');
    setSearchResults([]);
  };

  // Supprimer un utilisateur de la sélection
  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(user => user._id !== userId));
  };

  // Créer une nouvelle réunion
  const handleCreateMeeting = async () => {
    try {
      const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
      if (!token) throw new Error('Authentication token not found');
      
      const response = await fetch('https://runova.onrender.com/api/rooms/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          creatorId: user._id,
          title: meetingTitle || 'Réunion sans titre',
          participants: selectedUsers.map(user => user._id)
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Failed to create meeting: ${errorData}`);
      }

      const roomData = await response.json();
      setMeetingId(roomData.roomID);
      setIsMeetingCreated(true);
      
      // Notifier les participants
      await fetch('https://runova.onrender.com/api/rooms/notify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          roomID: roomData.roomID,
          participants: selectedUsers.map(user => user.email)
        })
      });
    } catch (error) {
      console.error('Erreur lors de la création de la réunion:', error);
      setError(error.message);
    }
  };

  // Copier le lien de la réunion
  const handleCopyLink = () => {
    const meetingLink = `${window.location.origin}/join/${meetingId}`;
    navigator.clipboard.writeText(meetingLink)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
      })
      .catch(err => {
        console.error('Erreur lors de la copie du lien:', err);
        setError('Impossible de copier le lien');
      });
  };

  // Gérer le partage d'écran
  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        if (videoRef.current) {
          videoRef.current.srcObject = screenStream;
        }
        
        // Remplacer les tracks vidéo dans toutes les connexions peer
        const videoTrack = screenStream.getVideoTracks()[0];
        Object.values(peerConnections.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });
        
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (localStream && videoRef.current) {
            videoRef.current.srcObject = localStream;
            
            // Restaurer les tracks locales
            const localVideoTrack = localStream.getVideoTracks()[0];
            Object.values(peerConnections.current).forEach(peer => {
              const sender = peer.getSenders().find(s => s.track.kind === 'video');
              if (sender && localVideoTrack) sender.replaceTrack(localVideoTrack);
            });
          }
        };
        
        setIsScreenSharing(true);
      } else {
        // Revenir à la caméra
        if (localStream && videoRef.current) {
          videoRef.current.srcObject = localStream;
          
          const localVideoTrack = localStream.getVideoTracks()[0];
          Object.values(peerConnections.current).forEach(peer => {
            const sender = peer.getSenders().find(s => s.track.kind === 'video');
            if (sender && localVideoTrack) sender.replaceTrack(localVideoTrack);
          });
        }
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Erreur lors du partage d\'écran:', error);
      setError('Impossible de partager l\'écran');
      setIsScreenSharing(false);
    }
  };

  // Activer/désactiver la vidéo
  const toggleVideo = async () => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    }
  };

  // Activer/désactiver l'audio
  const toggleAudio = () => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    }
  };

  // Raccrocher
  const handleHangUp = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    
    Object.values(peerConnections.current).forEach(peer => {
      peer.close();
    });
    
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-2xl font-semibold">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen flex-col">
        <div className="text-2xl font-semibold text-red-600 mb-4">Erreur</div>
        <div className="text-gray-700">{error}</div>
        <button 
          onClick={() => navigate('/dashboard')} 
          className="mt-6 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          Retour au tableau de bord
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {!isMeetingCreated ? (
        <div className="max-w-3xl mx-auto pt-12 px-4">
          <h1 className="text-3xl font-bold mb-8">Créer une nouvelle réunion</h1>
          
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="mb-6">
              <label htmlFor="meetingTitle" className="block text-sm font-medium text-gray-700 mb-1">
                Titre de la réunion
              </label>
              <input
                type="text"
                id="meetingTitle"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={meetingTitle}
                onChange={(e) => setMeetingTitle(e.target.value)}
                placeholder="Saisissez un titre pour votre réunion"
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Inviter des participants
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Rechercher par email"
                />
                
                {searchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg">
                    {searchResults.map((result) => (
                      <div
                        key={result._id}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer flex items-center"
                        onClick={() => handleSelectUser(result)}
                      >
                        <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mr-2">
                          {result.firstName ? result.firstName[0] : result.email[0].toUpperCase()}
                        </div>
                        <div>
                          <div>{result.firstName} {result.lastName}</div>
                          <div className="text-sm text-gray-500">{result.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            
            {selectedUsers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Participants sélectionnés</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((user) => (
                    <div 
                      key={user._id}
                      className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center text-sm"
                    >
                      <span>{user.email}</span>
                      <button 
                        onClick={() => handleRemoveUser(user._id)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div className="mt-6">
              <button
                onClick={handleCreateMeeting}
                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
                disabled={loading}
              >
                Créer la réunion
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="h-screen flex flex-col">
          {/* Barre de contrôle supérieure */}
          <div className="bg-gray-800 text-white p-4 flex justify-between items-center">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold">{meetingTitle || 'Réunion sans titre'}</h2>
              <span className="ml-4 text-sm">
                {activeParticipants.length + 1} participant(s)
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span>ID: {meetingId}</span>
                <button 
                  onClick={handleCopyLink} 
                  className="p-2 rounded-full hover:bg-gray-700"
                  title="Copier le lien"
                >
                  {isCopied ? <Check size={18} /> : <Copy size={18} />}
                </button>
              </div>
              <button
                onClick={() => setIsChatOpen(!isChatOpen)}
                className={`p-2 rounded-full ${isChatOpen ? 'bg-blue-600' : 'hover:bg-gray-700'}`}
                title="Chat"
              >
                <MessageSquare size={18} />
              </button>
              <button
                className="p-2 rounded-full hover:bg-gray-700"
                title="Inviter des participants"
              >
                <UserPlus size={18} />
              </button>
            </div>
          </div>
          
          {/* Contenu principal de la vidéoconférence */}
          <div className="flex-grow flex">
            {/* Affichage vidéo principal */}
            <div className={`relative flex-grow ${isChatOpen ? 'pr-64' : ''}`}>
              <div className="w-full h-full flex items-center justify-center bg-black">
                {isVideoEnabled || isScreenSharing ? (
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    playsInline 
                    className="max-w-full max-h-full"
                  />
                ) : (
                  <div className="w-32 h-32 bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-white text-3xl">
                      {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
              </div>
              
              {/* Participants miniatures */}
              <div className="absolute bottom-4 right-4 flex flex-wrap gap-2 justify-end max-w-full">
                {/* Afficher tous les participants actifs avec leurs streams */}
                {activeParticipants.map((participant) => (
                  <div 
                    key={participant.userID} 
                    className="w-24 h-24 bg-gray-800 rounded-lg flex items-center justify-center text-white relative overflow-hidden"
                  >
                    {remoteStreams[participant.userID] ? (
                      <video
                        autoPlay
                        playsInline
                        className="w-full h-full object-cover"
                        ref={(ref) => {
                          if (ref && remoteStreams[participant.userID]) {
                            ref.srcObject = remoteStreams[participant.userID];
                          }
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        {participant.userName?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                      {participant.userName || 'Participant'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Panneau de chat */}
            {isChatOpen && (
              <div className="w-64 bg-white border-l border-gray-300 flex flex-col">
                <div className="p-3 border-b border-gray-300">
                  <h3 className="font-medium">Chat</h3>
                </div>
                <div className="flex-grow p-3 overflow-y-auto">
                  <div className="text-sm text-gray-500 text-center">
                    Le chat sera disponible une fois que les participants rejoindront la réunion.
                  </div>
                </div>
                <div className="p-3 border-t border-gray-300">
                  <input
                    type="text"
                    placeholder="Écrire un message..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    disabled
                  />
                </div>
              </div>
            )}
          </div>
          
          {/* Contrôles de la vidéoconférence */}
          <div className="bg-gray-800 text-white p-4 flex justify-center">
            <div className="flex space-x-4">
              <button
                onClick={toggleAudio}
                className={`p-4 rounded-full ${isAudioEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
              </button>
              <button
                onClick={toggleVideo}
                className={`p-4 rounded-full ${isVideoEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
              </button>
              <button
                onClick={handleScreenShare}
                className={`p-4 rounded-full ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
              >
                <Share size={24} />
              </button>
              <button
                onClick={handleHangUp}
                className="p-4 rounded-full bg-red-600 hover:bg-red-700"
              >
                <Phone size={24} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Meet;