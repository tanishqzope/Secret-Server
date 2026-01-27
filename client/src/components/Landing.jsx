import React, { useState } from 'react';
import { Lock, User, LogIn } from 'lucide-react';

const Landing = ({ onJoin }) => {
    const [roomId, setRoomId] = useState('');
    const [userName, setUserName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (roomId && userName) {
            onJoin(roomId, userName);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 p-4">
            <div className="bg-dark-800 p-8 rounded-2xl shadow-2xl border border-dark-700 w-full max-w-md backdrop-blur-sm bg-opacity-90">
                <div className="flex flex-col items-center mb-8">
                    <div className="bg-primary/20 p-4 rounded-full mb-4">
                        <Lock className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        Secret Room
                    </h1>
                    <p className="text-gray-400 mt-2 text-center">
                        Secure, ephemeral communication.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 ml-1">Room Name</label>
                        <div className="relative">
                            <Lock className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
                            <input
                                type="text"
                                className="w-full bg-dark-900 border border-dark-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="Enter secret room name"
                                value={roomId}
                                onChange={(e) => setRoomId(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-300 ml-1">Alias</label>
                        <div className="relative">
                            <User className="w-5 h-5 absolute left-3 top-3 text-gray-500" />
                            <input
                                type="text"
                                className="w-full bg-dark-900 border border-dark-700 rounded-lg py-2.5 pl-10 pr-4 text-white focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                                placeholder="Your codename"
                                value={userName}
                                onChange={(e) => setUserName(e.target.value)}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-hover text-white font-semibold py-3 rounded-lg transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2 shadow-lg shadow-primary/25"
                    >
                        <LogIn className="w-5 h-5" />
                        Join Secure Channel
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Landing;
