// Update CallPage.jsx
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import VideoCall from '../../components/VideoCall';

const CallPage = () => {
  const { roomId, roomID } = useParams(); // Get both possible parameter names
  const navigate = useNavigate();
  const actualRoomId = roomId || roomID; // Use whichever is defined
  
  // Check if user is authenticated
  useEffect(() => {
    const userData = localStorage.getItem('userData') || sessionStorage.getItem('userData');
    if (!userData) {
      // Redirect to login if not authenticated
      navigate('/login', { replace: true });
    }
  }, [navigate]);
  
  const handleEndCall = () => {
    navigate('/index'); // Redirect to messaging after the call
  };
  
  if (!actualRoomId) {
    return <div className="p-8 text-center">Room ID is missing. Cannot join the call.</div>;
  }
  
  return (
    <div className="h-screen flex flex-col">
      <VideoCall 
        roomId={actualRoomId} 
        onEndCall={handleEndCall} 
      />
    </div>
  );
};

export default CallPage;