/**
 * Socket.io — chat éphémère
 * Sprint 4 : implémenter l'envoi/réception de messages temps réel
 * avec TTL (expires_at) et notifications "typing..."
 */
module.exports = function chatSocket(io) {
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);

    // TODO Sprint 4 : rejoindre la room de la conversation
    socket.on('join_conversation', (conversationId) => {
      socket.join(`conversation:${conversationId}`);
    });

    // TODO Sprint 4 : envoyer un message éphémère
    socket.on('send_message', (data) => {
      // Valider, enregistrer en base avec expires_at, puis broadcast
      socket.to(`conversation:${data.conversationId}`).emit('new_message', data);
    });

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.id}`);
    });
  });
};
