import { prepareFetch } from '../src/api';

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

  // TODO error thrown fails the test
  // test('throws an error when not mocked', async () => {
  //   expect(fetch).toBeUndefined();

  //   prepareFetch();

  //   expect(fetch.bind(null, '/path')).to.throw(
  //     'fetch is not defined. tried fetching /path'
  //   );

  //   globalThis.fetch = originalFetch;
  // });
});
