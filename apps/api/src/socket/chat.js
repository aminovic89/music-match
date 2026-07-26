/**
 * Socket.io — chat éphémère
 */
const { verifyToken } = require('../utils/jwt');
const chat = require('../services/chat');

module.exports = function chatSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentification requise'));
    }
    try {
      const payload = verifyToken(token);
      socket.userId = payload.sub;
      next();
    } catch (_err) {
      next(new Error('Token invalide ou expiré'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user ${socket.userId})`);

    socket.on('join_conversation', async (conversationId, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      if (!conversationId) {
        return ack({ ok: false, error: 'conversationId requis' });
      }
      try {
        await chat.assertParticipant(conversationId, socket.userId);
        socket.join(`conversation:${conversationId}`);
        ack({ ok: true });
      } catch (err) {
        ack({ ok: false, error: err.message });
      }
    });

    socket.on('send_message', async (data, callback) => {
      const ack = typeof callback === 'function' ? callback : () => {};
      const conversationId = data && data.conversationId;
      if (!conversationId) {
        return ack({ ok: false, error: 'conversationId requis' });
      }
      try {
        const message = await chat.createMessage(conversationId, socket.userId, data.content);
        io.to(`conversation:${conversationId}`).emit('new_message', message);
        ack({ ok: true, message });
      } catch (err) {
        ack({ ok: false, error: err.message });
      }
    });

    socket.on('typing', (conversationId) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing', { userId: socket.userId });
    });

    socket.on('stop_typing', (conversationId) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('stop_typing', { userId: socket.userId });
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
