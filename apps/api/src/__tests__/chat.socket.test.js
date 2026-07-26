const { createServer } = require('http');
const { Server } = require('socket.io');
const ioClient = require('socket.io-client');
const app = require('../app');
const chatSocket = require('../socket/chat');
const db = require('../database/db');
const { signToken } = require('../utils/jwt');

const testUserIds = [];
let httpServer;
let io;
let port;
let userA, userB, userC;
let tokenA, tokenB, tokenC;
let conversationId;

async function createUser(label) {
  const email = `chat-socket-test-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@musicmatch.test`;
  const result = await db.query(
    `INSERT INTO users (email, password_hash, first_name, age, intent)
     VALUES ($1, $2, $3, $4, 'romantic') RETURNING id`,
    [email, 'hash', `Sock${label}`, 25]
  );
  const id = result.rows[0].id;
  testUserIds.push(id);
  return id;
}

function connectClient(token) {
  return ioClient(`http://localhost:${port}`, {
    auth: { token },
    transports: ['websocket'],
    forceNew: true,
  });
}

beforeAll(async () => {
  httpServer = createServer(app);
  io = new Server(httpServer, { cors: { origin: '*' } });
  chatSocket(io);

  await new Promise((resolve) => {
    httpServer.listen(0, () => {
      port = httpServer.address().port;
      resolve();
    });
  });

  userA = await createUser('A');
  userB = await createUser('B');
  userC = await createUser('C');
  tokenA = signToken({ sub: userA });
  tokenB = signToken({ sub: userB });
  tokenC = signToken({ sub: userC });

  const [uA, uB] = userA < userB ? [userA, userB] : [userB, userA];
  const matchResult = await db.query(
    `INSERT INTO matches (user_a_id, user_b_id, score) VALUES ($1, $2, 0.9) RETURNING id`,
    [uA, uB]
  );
  const convResult = await db.query(
    `INSERT INTO conversations (match_id) VALUES ($1) RETURNING id`,
    [matchResult.rows[0].id]
  );
  conversationId = convResult.rows[0].id;
});

afterAll(async () => {
  io.close();
  await new Promise((resolve) => httpServer.close(resolve));
  await db.query('DELETE FROM users WHERE id = ANY($1)', [testUserIds]);
  await db.pool.end();
});

test('refuse la connexion sans token valide', (done) => {
  const client = ioClient(`http://localhost:${port}`, {
    transports: ['websocket'],
    forceNew: true,
  });
  client.on('connect_error', (err) => {
    expect(err.message).toMatch(/Authentification/);
    client.close();
    done();
  });
  client.on('connect', () => {
    client.close();
    done(new Error('Ne devrait pas se connecter sans token'));
  });
});

test('refuse join_conversation si non participant', (done) => {
  const client = connectClient(tokenC);
  client.on('connect_error', done);
  client.on('connect', () => {
    client.emit('join_conversation', conversationId, (ack) => {
      expect(ack.ok).toBe(false);
      client.close();
      done();
    });
  });
});

test('rejette un message vide via le callback', (done) => {
  const client = connectClient(tokenA);
  client.on('connect_error', done);
  client.on('connect', () => {
    client.emit('join_conversation', conversationId, (joinAck) => {
      expect(joinAck.ok).toBe(true);
      client.emit('send_message', { conversationId, content: '   ' }, (ack) => {
        expect(ack.ok).toBe(false);
        client.close();
        done();
      });
    });
  });
});

test(
  "send_message persiste et diffuse à tous les participants (y compris l'émetteur)",
  (done) => {
    const clientA = connectClient(tokenA);
    const clientB = connectClient(tokenB);
    let receivedCount = 0;

    const finish = () => {
      clientA.close();
      clientB.close();
      done();
    };

    const onNewMessage = (msg) => {
      expect(msg.content).toBe('Hello via socket');
      receivedCount += 1;
      if (receivedCount === 2) finish();
    };

    clientA.on('connect_error', done);
    clientB.on('connect_error', done);
    clientA.on('new_message', onNewMessage);
    clientB.on('new_message', onNewMessage);

    let joined = 0;
    const trySend = () => {
      joined += 1;
      if (joined === 2) {
        clientA.emit('send_message', { conversationId, content: 'Hello via socket' }, async (ack) => {
          expect(ack.ok).toBe(true);
          expect(ack.message.content).toBe('Hello via socket');

          const dbCheck = await db.query(
            'SELECT content FROM messages WHERE id = $1',
            [ack.message.id]
          );
          expect(dbCheck.rows[0].content).toBe('Hello via socket');
        });
      }
    };

    clientA.on('connect', () => clientA.emit('join_conversation', conversationId, trySend));
    clientB.on('connect', () => clientB.emit('join_conversation', conversationId, trySend));
  },
  10000
);
