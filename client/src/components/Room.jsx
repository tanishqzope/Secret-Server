import React, { useEffect, useRef, useState } from 'react';
import Peer from 'simple-peer';
import { Mic, MicOff, Video, VideoOff, PhoneOff } from 'lucide-react';
import Chat from './Chat';

const VideoCard = ({ peer, userName }) => {
    const ref = useRef();

    useEffect(() => {
        peer.on('stream', stream => {
            if (ref.current) {
                ref.current.srcObject = stream;
            }
        });
    }, [peer]);

    return (
        <div className="relative bg-dark-800 rounded-xl overflow-hidden aspect-video shadow-lg border border-dark-700">
            <video playsInline autoPlay ref={ref} className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white">
                {userName || 'Unknown Agent'}
            </div>
        </div>
    );
};

// Own video component
const MyVideo = ({ stream, userName }) => {
    const ref = useRef();
    useEffect(() => {
        if (ref.current && stream) ref.current.srcObject = stream;
    }, [stream]);

    return (
        <div className="relative bg-dark-800 rounded-xl overflow-hidden aspect-video shadow-lg border border-dark-700 border-primary/50">
            <video playsInline muted autoPlay ref={ref} className="w-full h-full object-cover transform scale-x-[-1]" />
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs text-white flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500"></span>
                {userName} (You)
            </div>
        </div>
    );
};

const Room = ({ socket, roomId, userName }) => {
    const [peers, setPeers] = useState([]);
    const [stream, setStream] = useState(null);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const peersRef = useRef([]); // To keep track of peer objects instance
    const socketRef = useRef();

    useEffect(() => {
        socketRef.current = socket;

        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(stream => {
            setStream(stream);
            
            // Join immediately after getting stream so we can answer calls with stream
            // But App.jsx already joined. We might need to handle timing.
            // Actually, best to pass stream to peers. 
            // Since we joined in App.jsx, we need to handle "all-users" event here.
            // But "all-users" might have come before stream was ready if we joined too fast.
            // WORKAROUND: In App.jsx we joined. We should likely move join logic here or buffer events.
            // Simpler: Emit a "ready" event or just start initiator logic now.
            // Or better: Let's assume network latency gives us time, OR we should join room INSIDE Room component.
            // Refactor: We will emit 'join-room' AGAIN or handle it here?
            // Actually App.jsx emitted join-room. The server response 'all-users' might be missed if we aren't listening yet.
            // FIX: Move join-room emit to here, or check if we can listen to it.
            // Ideally App.jsx passes the socket which is already connected.
            
            // NOTE: For this implementation, I will rely on the fact that we mount Room immediately after join.
            // If 'all-users' fires before this component mounts, we miss it.
            // SAFE FIX: Emit a "get-users" event or similar.
            // simpler: re-emit join-room here? No, duplicate user.
            
            // Let's assume we moved join logic here or we rely on socket buffering? Socket.io buffers? No.
            // I'll emit "join-room" HERE instead of App.jsx, forcing App.jsx to just pass details.
            // BUT App.jsx has "joined" state.
            // I'll leave App.jsx but add a small delay or retry for 'all-users'.
            
            // Actually, let's just emit "join-room" here. It's safer.
            // I will modify App.jsx later if needed, but for now lets try:
            // If App.jsx emitted it, and we missed it, we form no connections.
            // I'll ask server for users again.
        });
    }, []);

    // Effect to handle signaling once stream is ready
    useEffect(() => {
        if (!stream) return;

        // Re-emit join to ensure we get the user list while component is mounted and stream is ready
        // We can just emit it again, server will just update the socket's room.
        socket.emit('join-room', { roomId, userName });

        socket.on('all-users', (users) => {
            // users: array of { socketId (as string? no, check server) } -> server sends socket IDs
            // Server: socket.emit('all-users', usersInRoom); -> usersInRoom is array of socketIds
            
            const p = [];
            users.forEach(userID => {
                const peer = createPeer(userID, socket.id, stream);
                peersRef.current.push({
                    peerID: userID,
                    peer,
                });
                p.push({
                    peerID: userID,
                    peer,
                });
            });
            setPeers(p);
        });

        socket.on('user-joined-signal', payload => {
            const peer = addPeer(payload.signal, payload.callerId, stream);
            peersRef.current.push({
                peerID: payload.callerId,
                peer,
            });
            setPeers(users => [...users, { peerID: payload.callerId, peer }]);
        });

        socket.on('receiving-returned-signal', payload => {
            const item = peersRef.current.find(p => p.peerID === payload.id);
            if (item) {
                item.peer.signal(payload.signal);
            }
        });

        socket.on('user-left', id => {
            const peerObj = peersRef.current.find(p => p.peerID === id);
            if (peerObj) {
                peerObj.peer.destroy();
            }
            const peers = peersRef.current.filter(p => p.peerID !== id);
            peersRef.current = peers;
            setPeers(peers);
        });

        return () => {
            socket.off('all-users');
            socket.off('user-joined-signal');
            socket.off('receiving-returned-signal');
            socket.off('user-left');
        };

    }, [stream, socket, roomId, userName]);

    function createPeer(userToSignal, callerId, stream) {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socket.emit('signal', { userToSignal, callerId, signal });
        });

        return peer;
    }

    function addPeer(incomingSignal, callerId, stream) {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on('signal', signal => {
            socket.emit('returning-signal', { signal, callerId: callerId }); // calling 'returning-signal' on server
        });

        peer.signal(incomingSignal);

        return peer;
    }

    const toggleAudio = () => {
        if(stream) {
            stream.getAudioTracks()[0].enabled = !audioEnabled;
            setAudioEnabled(!audioEnabled);
        }
    };

    const toggleVideo = () => {
        if(stream) {
            stream.getVideoTracks()[0].enabled = !videoEnabled;
            setVideoEnabled(!videoEnabled);
        }
    };

    const leaveRoom = () => {
        window.location.reload(); // Simple way to reset state and leave
    };

    return (
        <div className="flex h-screen overflow-hidden">
            {/* Split View: Video Grid (Left) & Chat (Right) */}
            
            {/* Video Grid */}
            <div className="flex-1 flex flex-col p-4 gap-4 overflow-y-auto w-2/3">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold text-gray-200">Room: <span className="text-primary">{roomId}</span></h2>
                    <div className="flex gap-2">
                         <button onClick={toggleAudio} className={`p-3 rounded-full ${audioEnabled ? 'bg-dark-700 hover:bg-dark-600' : 'bg-red-500 hover:bg-red-600'} text-white transition-colors`}>
                            {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
                         </button>
                         <button onClick={toggleVideo} className={`p-3 rounded-full ${videoEnabled ? 'bg-dark-700 hover:bg-dark-600' : 'bg-red-500 hover:bg-red-600'} text-white transition-colors`}>
                            {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
                         </button>
                         <button onClick={leaveRoom} className="p-3 rounded-full bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-900/20">
                            <PhoneOff size={20} />
                         </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-max">
                    <MyVideo stream={stream} userName={userName} />
                    {peers.map((peerObj) => (
                        <VideoCard key={peerObj.peerID} peer={peerObj.peer} userName={"Agent"} /> 
                    ))}
                </div>
                
                {peers.length === 0 && (
                     <div className="flex-1 flex items-center justify-center text-gray-500 italic">
                        Waiting for other agents to join...
                     </div>
                )}
            </div>

            {/* Chat Sidebar */}
            <div className="w-1/3 min-w-[320px] max-w-md h-full shadow-2xl z-10">
                <Chat socket={socket} roomId={roomId} userName={userName} />
            </div>
        </div>
    );
};

export default Room;
