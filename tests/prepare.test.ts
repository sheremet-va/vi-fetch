import { prepareFetch } from '../src/api.js';

describe('prepare fetch mocks api', () => {
  const originalFetch = globalThis.fetch;

  test('prepareFetch', () => {
    prepareFetch();

    expect(typeof globalThis.fetch).toBe('function');

    expect(typeof fetch).toBe('function');

    globalThis.fetch = originalFetch;
  });

  test('prepare with custom', () => {
    const obj = {};
    prepareFetch(obj);

    // @ts-ignore
    expect(typeof obj.fetch).toBe('function');
  });

  test('prepare with custom key', () => {
    const obj = {};
    prepareFetch(obj, 'test');

    // @ts-ignore
    expect(typeof obj.test).toBe('function');
  });

  test('throws an error when not mocked', async () => {
    expect(fetch).toBeUndefined();

    prepareFetch();

    expect(fetch('/path')).rejects.toThrowError(
      'fetch is not defined. tried fetching "/path"'
    );

    globalThis.fetch = originalFetch;
  });
});
