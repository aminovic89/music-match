import { convertFormDataAsync } from 'expo/src/winter/fetch/convertFormData';

// Le fetch d'Expo sérialise lui-même le multipart : une partie { uri, name, type }
// seule est rejetée ("Unsupported FormDataPart implementation"), il lui faut bytes().
describe('partie photo et fetch Expo', () => {
  const part = (extra) => ({ uri: 'file:///p.jpg', name: 'p.jpg', type: 'image/jpeg', ...extra });
  const form = (value) => ({ entries: () => [['photo', value]] });

  it('rejette une partie sans bytes()', async () => {
    await expect(convertFormDataAsync(form(part()), 'b')).rejects.toThrow('Unsupported FormDataPart');
  });

  it('sérialise la partie avec bytes(), nom et type', async () => {
    const { body } = await convertFormDataAsync(form(part({ bytes: async () => new Uint8Array([1, 2, 3]) })), 'b');
    const text = String.fromCharCode(...body);
    expect(text).toContain('content-disposition: form-data; name="photo"; filename="p.jpg"');
    expect(text).toContain('content-type: image/jpeg');
    expect(text).toContain('\r\n\r\n\x01\x02\x03\r\n--b--');
  });
});
