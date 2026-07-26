const db = require('../database/db');

const MESSAGE_TTL_HOURS = parseInt(process.env.MESSAGE_TTL_HOURS || '24', 10);
const MAX_MESSAGE_LENGTH = 2000;

class ChatError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function getConversationParticipants(conversationId) {
  const result = await db.query(
    `SELECT c.id, m.user_a_id, m.user_b_id
     FROM conversations c
     JOIN matches m ON m.id = c.match_id
     WHERE c.id = $1`,
    [conversationId]
  );
  return result.rows[0] || null;
}

async function assertParticipant(conversationId, userId) {
  const conversation = await getConversationParticipants(conversationId);
  if (!conversation) {
    throw new ChatError(404, 'Conversation introuvable');
  }
  if (conversation.user_a_id !== userId && conversation.user_b_id !== userId) {
    throw new ChatError(403, 'Tu ne fais pas partie de cette conversation');
  }
  return conversation;
}

async function getUserConversations(userId) {
  const result = await db.query(
    `SELECT
       c.id,
       c.created_at,
       u.id AS user_id, u.first_name, u.avatar_url, u.age, u.city,
       lm.content AS last_message_content,
       lm.sent_at AS last_message_at,
       (SELECT COUNT(*) FROM messages
         WHERE conversation_id = c.id AND sender_id != $1
           AND is_read = false AND expires_at > NOW()) AS unread_count
     FROM conversations c
     JOIN matches m ON m.id = c.match_id
     JOIN users u ON u.id = CASE WHEN m.user_a_id = $1 THEN m.user_b_id ELSE m.user_a_id END
     LEFT JOIN LATERAL (
       SELECT content, sent_at FROM messages
       WHERE conversation_id = c.id AND expires_at > NOW()
       ORDER BY sent_at DESC LIMIT 1
     ) lm ON true
     WHERE m.user_a_id = $1 OR m.user_b_id = $1
     ORDER BY COALESCE(lm.sent_at, c.created_at) DESC`,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    created_at: row.created_at,
    user: {
      id: row.user_id,
      first_name: row.first_name,
      avatar_url: row.avatar_url,
      age: row.age,
      city: row.city,
    },
    last_message: row.last_message_content
      ? { content: row.last_message_content, sent_at: row.last_message_at }
      : null,
    unread_count: parseInt(row.unread_count, 10),
  }));
}

async function getConversationMessages(conversationId, userId) {
  await assertParticipant(conversationId, userId);

  await db.query(
    `UPDATE messages SET is_read = true
     WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false`,
    [conversationId, userId]
  );

  const result = await db.query(
    `SELECT id, conversation_id, sender_id, content, sent_at, expires_at, is_read
     FROM messages
     WHERE conversation_id = $1 AND expires_at > NOW()
     ORDER BY sent_at ASC`,
    [conversationId]
  );

  return result.rows;
}

async function createMessage(conversationId, senderId, content) {
  await assertParticipant(conversationId, senderId);

  const trimmed = typeof content === 'string' ? content.trim() : '';
  if (trimmed.length === 0) {
    throw new ChatError(400, 'Le message ne peut pas être vide');
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    throw new ChatError(400, `Le message dépasse ${MAX_MESSAGE_LENGTH} caractères`);
  }

  const expiresAt = new Date(Date.now() + MESSAGE_TTL_HOURS * 60 * 60 * 1000);

  const result = await db.query(
    `INSERT INTO messages (conversation_id, sender_id, content, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING id, conversation_id, sender_id, content, sent_at, expires_at, is_read`,
    [conversationId, senderId, trimmed, expiresAt]
  );

  await db.query(
    `INSERT INTO daily_limits (user_id, date, messages_count)
     VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (user_id, date)
     DO UPDATE SET messages_count = daily_limits.messages_count + 1`,
    [senderId]
  );

  return result.rows[0];
}

module.exports = {
  ChatError,
  assertParticipant,
  getUserConversations,
  getConversationMessages,
  createMessage,
};
