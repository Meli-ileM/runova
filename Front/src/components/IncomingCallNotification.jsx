import React from 'react';
import { useCall } from './CallContext';
import { Phone, PhoneOff } from 'lucide-react';

const IncomingCallNotification = () => {
  const { callState, acceptCall, rejectCall } = useCall();
  
  if (!callState.receivingCall) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 shadow-xl max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Appel entrant</h2>
        <p className="mb-6">
          {callState.callerName || "Quelqu'un"} vous appelle...
        </p>
        
        <div className="flex justify-center gap-4">
          <button
            onClick={rejectCall}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg"
          >
            <PhoneOff size={20} />
            Refuser
          </button>
          
          <button
            onClick={acceptCall}
            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg"
          >
            <Phone size={20} />
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallNotification;