import { prepareFetch, mockApi, createMockApi } from '../src/api';

beforeAll(() => {
  prepareFetch(globalThis.window, 'fetch');
});

beforeEach(() => {
  mockApi.clearAll();
});

describe('mocked api returns', () => {
  const baseUrl = 'http://localhost/api';
  const { mockApi } = createMockApi({ baseUrl });

  const callFetch = (cb: (r: Response) => any) => {
    return fetch(baseUrl + '/path').then(cb);
  };

  test('mock text', async () => {
    mockApi('GET', '/path').willResolve('text');

    await expect(callFetch((r) => r.text())).resolves.toBe('text');
  });

  test('mock json', async () => {
    mockApi('GET', '/path').willResolve({ hello: 'world' });

    await expect(callFetch((r) => r.json())).resolves.toEqual({
      hello: 'world',
    });
  });

  test('mock Blob', async () => {
    mockApi('GET', '/path').willResolve(new Blob());

    await expect(callFetch((r) => r.blob())).resolves.toEqual(new Blob());
  });

  test('mock arrayBuffer', async () => {
    mockApi('GET', '/path').willResolve(new ArrayBuffer(1));

    const result = await fetch(baseUrl + '/path').then((r) => r.arrayBuffer());

    expect(result).toEqual(new ArrayBuffer(1));
    expect(result).not.toEqual(new ArrayBuffer(2));
  });
});

describe('aliases', () => {
  const baseUrl = '';

  const { mockDelete, mockGet, mockPatch, mockPost, mockPut } = createMockApi({
    baseUrl,
  });

  const callApi = (...args: Parameters<typeof fetch>) => {
    return fetch(...args).then((r) => r.json());
  };

  beforeEach(() => {
    prepareFetch(globalThis.window, 'fetch');
  });

  test('mockGet', async () => {
    mockGet('/apples').willResolve({ apples: 33 });

    await expect(callApi('/apples')).resolves.toEqual({ apples: 33 });
    await expect(callApi('/apples', { method: 'GET' })).resolves.toEqual({
      apples: 33,
    });
  });

  test('mockDelete', async () => {
    mockDelete('/apples').willResolve({ id: 33 });
    await expect(callApi('/apples', { method: 'DELETE' })).resolves.toEqual({
      id: 33,
    });
  });

  test('mockPatch', async () => {
    mockPatch('/apples').willResolve({ id: 33 });
    await expect(callApi('/apples', { method: 'PATCH' })).resolves.toEqual({
      id: 33,
    });
  });

  test('mockPost', async () => {
    mockPost('/apples').willResolve({ id: 33 });
    await expect(callApi('/apples', { method: 'POST' })).resolves.toEqual({
      id: 33,
    });
  });

  test('mockPut', async () => {
    mockPut('/apples').willResolve({ id: 33 });
    await expect(callApi('/apples', { method: 'PUT' })).resolves.toEqual({
      id: 33,
    });
  });
});
