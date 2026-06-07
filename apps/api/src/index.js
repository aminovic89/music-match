require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createServer } = require('http');
const { Server } = require('socket.io');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3001' }
});

// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3001' }));
app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/music',    require('./routes/music'));
app.use('/api/matching', require('./routes/matching'));
app.use('/api/chat',     require('./routes/chat'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// Socket.io — chat éphémère
require('./socket/chat')(io);

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Music Match API running on port ${PORT}`);
});

module.exports = { app };
