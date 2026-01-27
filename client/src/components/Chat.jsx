import React, { useState, useEffect, useRef } from 'react';
import { Send, Paperclip, File, Download, Clock } from 'lucide-react';
import axios from 'axios';

const Chat = ({ socket, roomId, userName }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [uploading, setUploading] = useState(false);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        socket.on('receive-message', (message) => {
            setMessages((prev) => [...prev, message]);
        });

        socket.on('load-messages', (msgs) => {
            setMessages(msgs);
        });

        return () => {
            socket.off('receive-message');
            socket.off('load-messages');
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (input.trim()) {
            socket.emit('send-message', { roomId, text: input });
            setInput('');
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
            const res = await axios.post(`${serverUrl}/upload`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            socket.emit('send-message', {
                roomId,
                text: '',
                file: {
                    url: `${import.meta.env.VITE_SERVER_URL || 'http://localhost:5000'}${res.data.fileUrl}`,
                    name: res.data.fileName,
                    type: res.data.fileType
                }
            });
        } catch (err) {
            console.error(err);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-dark-800 border-l border-dark-700">
            <div className="p-4 border-b border-dark-700 bg-dark-800/50 backdrop-blur">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-accent animate-pulse"></span>
                    Secure Chat
                </h3>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Messages auto-delete in 24h
                </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => {
                    const isMe = msg.sender === userName;
                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] rounded-xl p-3 ${
                                isMe ? 'bg-primary text-white' : 'bg-dark-700 text-gray-200'
                            }`}>
                                <div className="text-xs opacity-70 mb-1 font-mono">{msg.sender}</div>
                                {msg.text && <p className="break-words">{msg.text}</p>}
                                {msg.file && (
                                    <div className="mt-2 p-2 bg-black/20 rounded-lg flex items-center gap-2">
                                        {msg.file.type.startsWith('image/') ? (
                                            <div className="space-y-2">
                                                <img src={msg.file.url} alt="upload" className="max-w-full rounded-lg max-h-48 object-cover" />
                                                <a href={msg.file.url} download={msg.file.name} className="flex items-center gap-1 text-xs hover:underline">
                                                    <Download className="w-3 h-3" /> {msg.file.name}
                                                </a>
                                            </div>
                                        ) : (
                                            <a href={msg.file.url} download={msg.file.name} className="flex items-center gap-2 hover:text-accent transition-colors">
                                                <File className="w-4 h-4" />
                                                <span className="text-sm underline">{msg.file.name}</span>
                                            </a>
                                        )}
                                    </div>
                                )}
                                <div className="text-[10px] opacity-50 text-right mt-1">
                                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={sendMessage} className="p-4 bg-dark-800 border-t border-dark-700 flex gap-2">
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                />
                <button
                    type="button"
                    onClick={() => fileInputRef.current.click()}
                    disabled={uploading}
                    className="p-2 text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                >
                    <Paperclip className="w-5 h-5" />
                </button>
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a secure message..."
                    className="flex-1 bg-dark-900 border border-dark-700 rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                    type="submit"
                    disabled={!input.trim() && !uploading}
                    className="p-2 bg-primary hover:bg-primary-hover text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                    <Send className="w-5 h-5" />
                </button>
            </form>
        </div>
    );
};

export default Chat;
