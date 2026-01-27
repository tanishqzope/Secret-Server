import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import Landing from './components/Landing';
import Room from './components/Room';

function App() {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState('');
  const [userName, setUserName] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Only connect when user joins or initially if preferred
    // Here we connect initially but join room later
    const newSocket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000');
    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  const handleJoin = (rId, uName) => {
    setRoomId(rId);
    setUserName(uName);
    setJoined(true);
    socket.emit('join-room', { roomId: rId, userName: uName });
  };

  if (!socket) return <div className="min-h-screen flex items-center justify-center bg-dark-900 text-white">Connecting...</div>;

  return (
    <div className="min-h-screen bg-dark-900 text-gray-100 font-sans">
      {!joined ? (
        <Landing onJoin={handleJoin} />
      ) : (
        <Room socket={socket} roomId={roomId} userName={userName} />
      )}
    </div>
  );
}

export default App;
