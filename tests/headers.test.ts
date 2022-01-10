import { HeadersMock } from '../src/headers.js';

describe('HeadersMock has the same behaviour as original', () => {
  test('names are normalized', () => {
    const h = new HeadersMock({
      'Content-Type': 'text/plain',
    });

    expect(h.has('Content-Type')).toBe(true);
    expect(h.has('content-type')).toBe(true);
    expect(h.get('content-type')).toBe('text/plain');

    h.append('Cookie', 'key=name');

    expect(h.has('cookie')).toBe(true);

    h.delete('Cookie');

    expect(h.has('cookie')).toBe(false);

    expect([...h.values()]).toEqual(['text/plain']);
    expect([...h.keys()]).toEqual(['content-type']);
    expect([...h.entries()]).toEqual([['content-type', 'text/plain']]);
  });
});
