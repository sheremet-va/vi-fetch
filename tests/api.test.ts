import '../src/extend.js';
import { prepareFetch, mockFetch, createMockFetch } from '../src/api.js';

beforeAll(() => {
  prepareFetch(globalThis, 'fetch');
});

beforeEach(() => {
  mockFetch.clearAll();
});

describe('mocked api returns', () => {
  const baseUrl = 'http://localhost/api';
  const { mockFetch } = createMockFetch({ baseUrl });

  const callFetch = (cb: (r: Response) => any) => {
    return fetch(baseUrl + '/path').then(cb);
  };

  test('mock text', async () => {
    mockFetch('GET', '/path').willResolve('text');

    await expect(callFetch((r) => r.text())).resolves.toBe('text');
  });

  test('mock json', async () => {
    mockFetch('GET', '/path').willResolve({ hello: 'world' });

    await expect(callFetch((r) => r.json())).resolves.toEqual({
      hello: 'world',
    });
  });

  test('mock blob', async () => {
    mockFetch('GET', '/path').willResolve(new Blob());

    const result = await fetch(baseUrl + '/path').then((r) => r.blob());

    expect(result).toStrictEqual(new Blob());
  });

  test('mock arrayBuffer', async () => {
    mockFetch('GET', '/path').willResolve(new ArrayBuffer(1));

    const result = await fetch(baseUrl + '/path').then((r) => r.arrayBuffer());

    expect(result).toStrictEqual(new ArrayBuffer(1));
    expect(result).not.toStrictEqual(new ArrayBuffer(2));
  });
});

describe('aliases', () => {
  const baseUrl = 'https://api.com/v1';

  const { mockDelete, mockGet, mockPatch, mockPost, mockPut } = createMockFetch(
    {
      baseUrl,
    }
  );

  const callApi = (url: string, ...args: [Parameters<typeof fetch>[1]?]) => {
    return fetch(baseUrl + url, ...args).then((r) => r.json());
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
  const baseUrl = 'https://api.com/v1';

  const { mockFetch } = createMockFetch({
    baseUrl,
  });

  const callApi = (url: string, ...args: [Parameters<typeof fetch>[1]?]) => {
    return fetch(baseUrl + url, ...args).then((r) => r.json());
  };

  test('resolving once', async () => {
    mockFetch('GET', '/apples').willResolveOnce(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    // calls real fetch
    await expect(callApi('/apples')).rejects.toThrowError(
      /fetch is not defined/
    );
  });

  test('resolving everytime', async () => {
    mockFetch('GET', '/apples').willResolve(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    await expect(callApi('/apples')).resolves.toBe(33);
  });

  test('failing once', async () => {
    mockFetch('GET', '/apples').willFailOnce(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    // calls real fetch
    await expect(callApi('/apples')).rejects.toThrowError(
      /fetch is not defined/
    );
  });

  test('failing everytime', async () => {
    mockFetch('GET', '/apples').willFail(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    await expect(callApi('/apples')).resolves.toBe(33);
    await expect(callApi('/apples')).resolves.toBe(33);
  });

  test('throwing once', async () => {
    mockFetch('GET', '/apples').willThrowOnce('error');
    await expect(callApi('/apples')).rejects.toThrowError('error');
    // calls real fetch
    await expect(callApi('/apples')).rejects.toThrowError(
      /fetch is not defined/
    );
  });

  test('throwing everytime', async () => {
    mockFetch('GET', '/apples').willThrow('error');
    await expect(callApi('/apples')).rejects.toThrowError('error');
    await expect(callApi('/apples')).rejects.toThrowError('error');
    await expect(callApi('/apples')).rejects.toThrowError('error');
  });

  test('chaining', async () => {
    mockFetch('GET', '/apples')
      .willResolveOnce(42)
      .willFailOnce(10)
      .willThrowOnce('error');

    await expect(callApi('/apples')).resolves.toBe(42);
    await expect(callApi('/apples')).resolves.toBe(10);
    await expect(callApi('/apples')).rejects.toThrowError('error');
  });

  test('willDo', async () => {
    mockFetch('GET', '/apples', false).willDo((url) => {
      if (url.searchParams.get('count') === '2') {
        return { body: [] };
      }

      return { body: [1] };
    });

    expect(callApi('/apples')).resolves.toEqual([1]);
    expect(callApi('/apples?count=2')).resolves.toEqual([]);
  });

  test('regexp path', async () => {
    mockFetch('GET', /\/apples/).willResolveOnce(33);
    await expect(callApi('/apples')).resolves.toBe(33);
  });
});

describe('support functions', () => {
  const baseUrl = 'https://api.com/v1';

  const { mockGet } = createMockFetch({
    baseUrl,
  });

  const callApi = (url: string, ...args: [Parameters<typeof fetch>[1]?]) => {
    return fetch(baseUrl + url, ...args).then((r) => r.json());
  };

  test('withHeaders', async () => {
    const mock = mockGet('/apples')
      .withHeaders([['Content-Type', 'text/plain']])
      .willResolve([{ count: 33 }]);

    await callApi('/apples');

    expect(mock.getRouteResponses()[0].headers.get('Content-Type')).toBe(
      'text/plain'
    );
  });
});

describe('reassigning behaviour', () => {
  const baseUrl = 'https://api.com/v1';

  const { mockGet } = createMockFetch({
    baseUrl,
  });

  const callApi = (url: string, ...args: [Parameters<typeof fetch>[1]?]) => {
    return fetch(baseUrl + url, ...args).then((r) => r.json());
  };

  test('reassigning "will"', async () => {
    const api = mockGet('/path').willResolve({
      data: 1,
    });

    await callApi('/path');

    expect(api).toFetchNthTime(1, { data: 1 });

    api.willResolve({
      data: 22,
    });

    await callApi('/path');

    expect(api).toFetchNthTime(2, { data: 22 });

    api.willThrow('Error');

    expect(callApi('/path')).rejects.toThrow('Error');
  });

  test('reassigning "will" that has onces', async () => {
    const api = mockGet('/path');

    api.willResolveOnce({ data: 1 }).willResolve({ data: 22 });

    await callApi('/path');
    await callApi('/path');

    expect(api).toFetchNthTime(1, { data: 1 });
    expect(api).toFetchNthTime(2, { data: 22 });

    api.willResolve({ data: 55 });

    await callApi('/path');

    expect(api).toFetchNthTime(3, { data: 55 });
  });
});
