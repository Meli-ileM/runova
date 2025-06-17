import React, { useEffect, useRef, useState } from 'react';
import { Video, Mic, MicOff, VideoOff, Share, Phone } from 'lucide-react';
import { useCall } from '../components/CallContext';

const VideoCall = ({ roomId, onEndCall }) => {
  const {
    stream,
    myVideoRef,
    peerConnections,
    joinRoom,
    endCall,
    toggleVideo,
    toggleAudio
  } = useCall();
  
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const screenStreamRef = useRef(null);
  const [remoteStreams, setRemoteStreams] = useState({});
  const remotePeerRefs = useRef({});

  // Rejoindre la room quand le composant est monté
  useEffect(() => {
    joinRoom(roomId);
    
    return () => {
      // Nettoyer lors du démontage
      if (screenStreamRef.current) {
        screenStreamRef.current.getTracks().forEach(track => track.stop());
      }
      endCall();
    };
  }, [roomId]);

  // Surveiller les connexions peer et extraire les flux distants
  useEffect(() => {
    console.log("peerConnections changed:", Object.keys(peerConnections).length);
    
    // Pour chaque connexion peer, configurer les événements de stream
    Object.entries(peerConnections).forEach(([peerId, peer]) => {
      if (!peer) return;
      
      // Éviter de dupliquer les gestionnaires d'événements
      if (!remotePeerRefs.current[peerId]) {
        remotePeerRefs.current[peerId] = peer;
        
        // Ajouter l'événement 'stream'
        peer.on('stream', (stream) => {
          console.log(`Received stream from peer ${peerId}`, stream);
          setRemoteStreams(prev => ({
            ...prev,
            [peerId]: stream
          }));
        });
        
        // Ajouter l'événement 'close'
        peer.on('close', () => {
          console.log(`Peer ${peerId} connection closed`);
          setRemoteStreams(prev => {
            const newStreams = {...prev};
            delete newStreams[peerId];
            return newStreams;
          });
          
          delete remotePeerRefs.current[peerId];
        });
        
        // Ajouter l'événement 'error'
        peer.on('error', (err) => {
          console.error(`Error in peer ${peerId}:`, err);
        });
      }
    });
    
    // Nettoyage des pairs qui ne sont plus dans peerConnections
    Object.keys(remotePeerRefs.current).forEach(peerId => {
      if (!peerConnections[peerId]) {
        console.log(`Removing reference to disconnected peer ${peerId}`);
        delete remotePeerRefs.current[peerId];
        
        setRemoteStreams(prev => {
          const newStreams = {...prev};
          delete newStreams[peerId];
          return newStreams;
        });
      }
    });
  }, [peerConnections]);

  // Activer/désactiver la vidéo
  const handleToggleVideo = () => {
    toggleVideo();
    setIsVideoEnabled(!isVideoEnabled);
  };

  // Activer/désactiver l'audio
  const handleToggleAudio = () => {
    toggleAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  // Gérer le partage d'écran
  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });
        
        screenStreamRef.current = screenStream;
        
        if (myVideoRef.current) {
          // Sauvegarder la source d'origine dans une propriété personnalisée
          myVideoRef.current._originalSrcObject = myVideoRef.current.srcObject;
          myVideoRef.current.srcObject = screenStream;
        }
        
        // Arrêter le partage d'écran quand l'utilisateur arrête
        screenStream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          if (myVideoRef.current && myVideoRef.current._originalSrcObject) {
            myVideoRef.current.srcObject = myVideoRef.current._originalSrcObject;
          }
        };
        
        setIsScreenSharing(true);
      } else {
        // Revenir à la caméra
        if (screenStreamRef.current) {
          screenStreamRef.current.getTracks().forEach(track => track.stop());
        }
        
        if (myVideoRef.current && myVideoRef.current._originalSrcObject) {
          myVideoRef.current.srcObject = myVideoRef.current._originalSrcObject;
        }
        
        setIsScreenSharing(false);
      }
    } catch (error) {
      console.error('Erreur lors du partage d\'écran:', error);
      setIsScreenSharing(false);
    }
  };

  // Terminer l'appel
  const handleEndCall = () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }
    endCall();
    onEndCall();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-full">
          {/* Video locale */}
          <div className="bg-black rounded-lg overflow-hidden relative">
            <video 
              ref={myVideoRef}
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white p-1 rounded">
              Vous
            </div>
          </div>
          
          {/* Vidéos des participants */}
          {Object.entries(remoteStreams).map(([peerId, stream]) => {
            console.log(`Rendering remote stream for peer ${peerId}`);
            const videoRef = React.createRef();
            
            return (
              <div key={peerId} className="bg-black rounded-lg overflow-hidden relative">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  onLoadedMetadata={() => console.log(`Video for peer ${peerId} loaded`)}
                />
                <div className="absolute bottom-2 left-2 bg-black bg-opacity-50 text-white p-1 rounded">
                  Participant {peerId.substring(0, 5)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Contrôles de la vidéoconférence */}
      <div className="bg-gray-800 text-white p-4 flex justify-center">
        <div className="flex space-x-4">
          <button
            onClick={handleToggleAudio}
            className={`p-4 rounded-full ${isAudioEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'}`}
            title={isAudioEnabled ? "Couper le microphone" : "Activer le microphone"}
          >
            {isAudioEnabled ? <Mic size={24} /> : <MicOff size={24} />}
          </button>
          <button
            onClick={handleToggleVideo}
            className={`p-4 rounded-full ${isVideoEnabled ? 'bg-gray-600 hover:bg-gray-700' : 'bg-red-600 hover:bg-red-700'}`}
            title={isVideoEnabled ? "Couper la caméra" : "Activer la caméra"}
          >
            {isVideoEnabled ? <Video size={24} /> : <VideoOff size={24} />}
          </button>
          <button
            onClick={handleScreenShare}
            className={`p-4 rounded-full ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-700'}`}
            title={isScreenSharing ? "Arrêter le partage" : "Partager l'écran"}
          >
            <Share size={24} />
          </button>
          <button
            onClick={handleEndCall}
            className="p-4 rounded-full bg-red-600 hover:bg-red-700"
            title="Terminer l'appel"
          >
            <Phone size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Fonction pour appliquer les flux vidéo après le rendu du composant
const useVideoEffect = (videoRef, stream) => {
  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [videoRef, stream]);
};

export default VideoCall;