// Tests unitaires (db et Brevo mockés) de la notification email de match
jest.mock('axios');
jest.mock('../database/db', () => ({ query: jest.fn(), withTransaction: jest.fn() }));

const axios = require('axios');

const AMINE = { id: 'a', email: 'amine@example.test', first_name: 'Amine' };
const IMEN = { id: 'b', email: 'imen@example.test', first_name: 'Imen' };

function loadEmailWithBrevo() {
  let email;
  process.env.BREVO_API_KEY = 'test-key';
  process.env.EMAIL_FROM = 'noreply@example.test';
  jest.isolateModules(() => { email = require('../services/email'); });
  delete process.env.BREVO_API_KEY;
  delete process.env.EMAIL_FROM;
  return email;
}

describe('sendMatchEmail', () => {
  afterEach(() => jest.clearAllMocks());

  it('envoie via Brevo un email avec le prénom du match et le lien vers les matchs', async () => {
    axios.post.mockResolvedValue({});
    const { sendMatchEmail } = loadEmailWithBrevo();

    await sendMatchEmail(AMINE, IMEN);

    const [url, body] = axios.post.mock.calls[0];
    expect(url).toBe('https://api.brevo.com/v3/smtp/email');
    expect(body.to).toEqual([{ email: 'amine@example.test', name: 'Amine' }]);
    expect(body.subject).toBe('Nouveau match avec Imen sur Music Match');
    expect(body.htmlContent).toContain('Imen a aussi liké ton profil');
    expect(body.htmlContent).toContain('/matches');
  });

  it('échappe le HTML des prénoms', async () => {
    axios.post.mockResolvedValue({});
    const { sendMatchEmail } = loadEmailWithBrevo();

    await sendMatchEmail(AMINE, { ...IMEN, first_name: '<b>Imen</b>' });

    expect(axios.post.mock.calls[0][1].htmlContent).toContain('&lt;b&gt;Imen&lt;/b&gt;');
  });

  it('fournit un bouton vers les matchs et une version texte', async () => {
    axios.post.mockResolvedValue({});
    const { sendMatchEmail } = loadEmailWithBrevo();

    await sendMatchEmail(AMINE, { ...IMEN, first_name: '<b>Imen</b>' });

    const { htmlContent, textContent } = axios.post.mock.calls[0][1];
    expect(htmlContent).toMatch(/<a href="[^"]*\/matches"[^>]*>Voir le match et lui écrire<\/a>/);
    expect(htmlContent).not.toContain('<b>Imen</b>');
    expect(htmlContent).not.toMatch(/<img/);
    // Le texte brut n'est pas du HTML : prénom non échappé, lien en clair
    expect(textContent).toContain('<b>Imen</b> a aussi liké ton profil');
    expect(textContent).toMatch(/Voir le match et lui écrire :\n\S+\/matches/);
    expect(textContent).toContain('Ce match expire dans 48 h.');
  });

  it('salue sans prénom quand il manque', async () => {
    axios.post.mockResolvedValue({});
    const { sendMatchEmail } = loadEmailWithBrevo();

    await sendMatchEmail({ ...AMINE, first_name: null }, IMEN);

    expect(axios.post.mock.calls[0][1].textContent.startsWith('Bonjour,\n')).toBe(true);
  });

  it('n\'appelle pas Brevo sans clé API', async () => {
    const { sendMatchEmail } = require('../services/email');
    await sendMatchEmail(AMINE, IMEN);
    expect(axios.post).not.toHaveBeenCalled();
  });
});

describe('likeUser — notification de match', () => {
  let email;
  let matching;
  let client;

  beforeEach(() => {
    jest.resetModules();
    jest.doMock('../services/email', () => ({ sendMatchEmail: jest.fn() }));
    email = require('../services/email');
    matching = require('../services/matching');
    const mockedDb = require('../database/db');

    client = { query: jest.fn() };
    mockedDb.withTransaction.mockImplementation((fn) => fn(client));
    mockedDb.query.mockImplementation((sql) => {
      if (sql.includes('SELECT id FROM users')) return { rows: [{ id: IMEN.id }] };
      if (sql.includes('FROM daily_limits')) return { rows: [] };
      if (sql.includes('SELECT id FROM likes')) return { rows: [{ id: 'like-1' }] };
      if (sql.includes('FROM music_profiles')) return { rows: [{ top_artists: ['Elissa'] }] };
      if (sql.includes('ANY($1::uuid[])')) return { rows: [AMINE, IMEN] };
      return { rows: [] };
    });
  });

  afterEach(() => {
    jest.dontMock('../services/email');
    jest.clearAllMocks();
  });

  it('prévient par email la personne qui avait liké en premier quand le match est créé', async () => {
    client.query.mockImplementation((sql) =>
      sql.includes('INSERT INTO matches') ? { rows: [{ id: 'match-1' }] } : { rows: [] }
    );

    // Imen (b) like Amine (a), qui l'avait liké en premier
    const result = await matching.likeUser(IMEN.id, AMINE.id);

    expect(result.matched).toBe(true);
    expect(email.sendMatchEmail).toHaveBeenCalledTimes(1);
    expect(email.sendMatchEmail).toHaveBeenCalledWith(AMINE, IMEN);
  });

  it('n\'envoie rien si le match existait déjà (appel concurrent)', async () => {
    client.query.mockImplementation((sql) =>
      sql.includes('SELECT id, user_a_id') ? { rows: [{ id: 'match-1' }] } : { rows: [] }
    );

    await matching.likeUser(IMEN.id, AMINE.id);

    expect(email.sendMatchEmail).not.toHaveBeenCalled();
  });

  it('ne fait pas échouer le like si l\'envoi échoue', async () => {
    client.query.mockImplementation((sql) =>
      sql.includes('INSERT INTO matches') ? { rows: [{ id: 'match-1' }] } : { rows: [] }
    );
    email.sendMatchEmail.mockRejectedValue(new Error('Brevo indisponible'));

    await expect(matching.likeUser(IMEN.id, AMINE.id)).resolves.toMatchObject({ matched: true });
  });
});
