import { ApiClient } from '../../../../packages/shared/src/api/client';

describe('ApiClient.uploadPhoto', () => {
  it('POST multipart sans Content-Type forcé, avec Bearer et champ photo', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ user: { avatar_url: 'u' } }) })
    );
    const c = new ApiClient();
    c.setToken('tok');
    const res = await c.uploadPhoto({ uri: 'file:///p.jpg', name: 'p.jpg', type: 'image/jpeg' });
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/users\/me\/photo$/);
    expect(opts.method).toBe('POST');
    expect(opts.headers['Content-Type']).toBeUndefined();
    expect(opts.headers.Authorization).toBe('Bearer tok');
    expect(opts.body).toBeInstanceOf(FormData);
    expect(opts.body.get('photo')).toBeTruthy();
    expect(res.user.avatar_url).toBe('u');
  });

  it("expose error.status, même si la réponse n'est pas du JSON", async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: false, status: 413, json: () => Promise.reject(new Error('html')) }));
    await expect(new ApiClient().uploadPhoto({ uri: 'x', name: 'x.jpg', type: 'image/jpeg' })).rejects.toMatchObject({ status: 413 });
  });

  it('les requêtes JSON restent inchangées', async () => {
    global.fetch = jest.fn(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) }));
    await new ApiClient().updateMe({ city: 'x' });
    const opts = global.fetch.mock.calls[0][1];
    expect(opts.headers['Content-Type']).toBe('application/json');
    expect(opts.body).toBe('{"city":"x"}');
  });
});
