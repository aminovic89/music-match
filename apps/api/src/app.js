require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/error');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3001' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));
app.use(express.json());

// Routes
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/users',    require('./routes/users'));
app.use('/api/music',    require('./routes/music'));
app.use('/api/matching', require('./routes/matching'));
app.use('/api/chat',     require('./routes/chat'));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', env: process.env.NODE_ENV }));

// Gestion d'erreurs (toujours en dernier)
app.use(errorHandler);

module.exports = app;
