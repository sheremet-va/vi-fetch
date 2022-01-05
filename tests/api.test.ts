import { prepareFetch, mockApi, createMockApi } from '../src/api';

beforeAll(() => {
  prepareFetch(globalThis, 'fetch');
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

  test('mock blob', async () => {
    mockApi('GET', '/path').willResolve(new Blob());

    const result = await fetch(baseUrl + '/path').then((r) => r.blob());

    expect(result).toEqual(new Blob());
    expect(result).not.toEqual(new Blob(['h']));
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

describe('handlers', () => {
  const baseUrl = '';

  const { mockApi } = createMockApi({
    baseUrl,
  });

  const callApi = (...args: Parameters<typeof fetch>) => {
    return fetch(...args).then((r) => r.json());
  };

  test('resolving once', async () => {
    mockApi('GET', '/apples').willResolveOnce(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    // calls real fetch
    await expect(callApi('/apples')).rejects.toThrowError(
      /fetch is not defined/
    );
  });

  test('resolving everytime', async () => {
    mockApi('GET', '/apples').willResolve(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    await expect(callApi('/apples')).resolves.toBe(33);
  });

  test('failing once', async () => {
    mockApi('GET', '/apples').willFailOnce(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    // calls real fetch
    await expect(callApi('/apples')).rejects.toThrowError(
      /fetch is not defined/
    );
  });

  test('failing everytime', async () => {
    mockApi('GET', '/apples').willFail(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    await expect(callApi('/apples')).resolves.toBe(33);
  });

  test('throwing once', async () => {
    mockApi('GET', '/apples').willThrowOnce('error');
    await expect(callApi('/apples')).rejects.toThrowError('error');
    // calls real fetch
    await expect(callApi('/apples')).rejects.toThrowError(
      /fetch is not defined/
    );
  });

  test('throwing everytime', async () => {
    mockApi('GET', '/apples').willThrow('error');
    await expect(callApi('/apples')).rejects.toThrowError('error');
    await expect(callApi('/apples')).rejects.toThrowError('error');
    await expect(callApi('/apples')).rejects.toThrowError('error');
  });

  test('chaining', async () => {
    mockApi('GET', '/apples')
      .willResolveOnce(42)
      .willFailOnce(10)
      .willThrowOnce('error');

    await expect(callApi('/apples')).resolves.toBe(42);
    await expect(callApi('/apples')).resolves.toBe(10);
    await expect(callApi('/apples')).rejects.toThrowError('error');
  });
});
