const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

// Enable CORS
app.use(cors());
app.use(express.json());

// Setup Socket.io
const io = new Server(server, {
    cors: {
        origin: "*", // Allow all for now, lock down later if needed.
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 5000;

// Ephemeral Storage
const rooms = new Map(); // roomId -> Set(userId)
const messages = new Map(); // roomId -> [ { id, sender, text, file, timestamp } ]
const users = new Map(); // socketId -> { roomId, userName }

// File Upload Config (Temporary storage)
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage });

// Routes
app.get('/', (req, res) => {
    res.send('Secret Communication Server Running');
});

// File Upload Endpoint
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded');
    
    // Construct file URL (assuming server serves static files or just returns path)
    // For local dev, we'll serve static files from uploads
    const fileUrl = `/uploads/${req.file.filename}`;
    
    res.json({
        fileUrl,
        fileName: req.file.originalname,
        fileType: req.file.mimetype
    });
});

app.use('/uploads', express.static(uploadDir));

// Socket.io Logic
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join Room
    socket.on('join-room', ({ roomId, userName }) => {
        socket.join(roomId);
        users.set(socket.id, { roomId, userName });

        if (!rooms.has(roomId)) {
            rooms.set(roomId, new Set());
        }
        rooms.get(roomId).add(socket.id);

        // Notify others in room
        socket.to(roomId).emit('user-joined', { userId: socket.id, userName });

        // Send existing messages (that are < 24h old)
        if (messages.has(roomId)) {
            const roomMessages = messages.get(roomId).filter(msg => {
                return (Date.now() - msg.timestamp) < 24 * 60 * 60 * 1000;
            });
            socket.emit('load-messages', roomMessages);
        }
        
        // Notify existing users to initiate WebRTC
        const usersInRoom = Array.from(rooms.get(roomId)).filter(id => id !== socket.id);
        socket.emit('all-users', usersInRoom);
    });

    // Chat Message
    socket.on('send-message', ({ roomId, text, file }) => {
        const user = users.get(socket.id);
        if (!user) return;

        const message = {
            id: uuidv4(),
            sender: user.userName,
            senderId: socket.id,
            text,
            file, // { url, name, type }
            timestamp: Date.now()
        };

        if (!messages.has(roomId)) {
            messages.set(roomId, []);
        }
        messages.get(roomId).push(message);

        io.to(roomId).emit('receive-message', message);
    });

    // WebRTC Signaling
    socket.on('signal', (payload) => {
        // payload: { userToSignal, signal, callerId }
        io.to(payload.userToSignal).emit('user-joined-signal', { 
            signal: payload.signal, 
            callerId: payload.callerId 
        });
    });

    socket.on('returning-signal', (payload) => {
        io.to(payload.callerId).emit('receiving-returned-signal', { 
            signal: payload.signal, 
            id: socket.id 
        });
    });

    socket.on('disconnect', () => {
        const user = users.get(socket.id);
        if (user) {
            const { roomId } = user;
            if (rooms.has(roomId)) {
                rooms.get(roomId).delete(socket.id);
                if (rooms.get(roomId).size === 0) {
                    rooms.delete(roomId);
                }
            }
            socket.to(roomId).emit('user-left', socket.id);
            users.delete(socket.id);
        }
        console.log('User disconnected:', socket.id);
    });
});

// Auto-delete cleanup task (runs every minute)
setInterval(() => {
    const NOW = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

    for (const [roomId, msgs] of messages.entries()) {
        const filtered = msgs.filter(msg => (NOW - msg.timestamp) < TWENTY_FOUR_HOURS);
        if (filtered.length !== msgs.length) {
            messages.set(roomId, filtered);
            // Optional: Emit cleanup event if needed to update clients in real-time
        }
        if (filtered.length === 0 && !rooms.has(roomId)) {
             // If room empty and no messages, could clean up map key too
             messages.delete(roomId);
        }
    }
    
    // Also cleanup files in uploads dir? 
    // Ideally we track file timestamps and delete them too. 
    // Simple implementation: check file mtime.
    fs.readdir(uploadDir, (err, files) => {
        if (err) return;
        files.forEach(file => {
             const filePath = path.join(uploadDir, file);
             fs.stat(filePath, (err, stats) => {
                 if (err) return;
                 if (NOW - stats.mtimeMs > TWENTY_FOUR_HOURS) {
                     fs.unlink(filePath, () => {});
                 }
             });
        });
    });

}, 60 * 1000);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
