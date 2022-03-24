import '../src/extend.js';
import { prepareFetch, mockFetch } from '../src/api.js';

beforeAll(() => {
  prepareFetch(globalThis, 'fetch');
  mockFetch.setOptions({ baseUrl: 'https://api.com' });
});

beforeEach(() => {
  mockFetch.clearAll();
});

const callApi = (url: string, ...args: [options?: RequestInit]) => {
  return fetch(`https://api.com${url}`, ...args);
};

describe('toFetch', () => {
  test('api was called', async () => {
    const mock = mockFetch('GET', '/apples').willResolve([]);

    expect(mock).not.toFetch();

    await callApi('/apples');

    expect(mock).toFetch();
    expect(mock).toFetch([]);

    expect(mock).not.toFetch(['hello world']);
  });

  test('api was called nth time with specific response', async () => {
    const mock = mockFetch('GET', '/apples').willResolve([]);

    await callApi('/apples');

    mock.willResolve(['1kg']);

    await callApi('/apples');

    expect(mock).toFetchNthTime(1, []);
    expect(mock).toFetchNthTime(2, ['1kg']);
  });

  test('api wasnt called', async () => {
    const mock = mockFetch('GET', '/apples').willResolve();
    mockFetch('GET', '/apples33').willFail();

    await callApi('/apples33');

    expect(mock).not.toFetch();
  });

  test('api was called with query', async () => {
    const mock = mockFetch('GET', '/apples?count=3').willResolve();

    expect(fetch('/apples')).rejects.toThrowError();

    await callApi('/apples?count=3');

    expect(mock).toFetch();
  });

  test('api was called with query but mock wihout', async () => {
    const mock = mockFetch('GET', '/apples').willResolve();

    expect(fetch('/apples?count=2')).rejects.toThrowError();

    await callApi('/apples');

    expect(mock).toFetch();
  });

  test('api was called without query', async () => {
    const mock = mockFetch('GET', '/apples', false).willResolve();

    await callApi('/apples?count=3');

    expect(mock).toFetch();
  });
});

describe('toFetchTimes', () => {
  test('api called nth times', async () => {
    const mock = mockFetch('GET', '/apples').willResolve();

    expect(mock).toFetchTimes(0);

    await callApi('/apples');
    await callApi('/apples');
    await callApi('/apples');

    expect(fetch('/apples?count=5')).rejects.toThrowError();

    expect(mock).not.toFetchTimes(0);
    expect(mock).toFetchTimes(3);
  });

  test('api called nth times with no query', async () => {
    const mock = mockFetch('GET', '/apples', false).willResolve();

    expect(mock).toFetchTimes(0);

    await callApi('/apples?count=5');
    await callApi('/apples?count=1');
    await callApi('/apples?count=3');

    expect(mock).toFetchTimes(3);
  });
});

describe('toFetchWithBody', () => {
  test('body with string', async () => {
    const mock = mockFetch('POST', '/apples').willResolve();

    await callApi('/apples', { method: 'POST', body: 'text' });

    expect(mock).toFetchWithBody('text');
    expect(mock).not.toFetchWithBody('zoo');
  });

  test('body with object', async () => {
    const mock = mockFetch('POST', '/apples').willResolve();

    await callApi('/apples', { method: 'POST', body: '{ "string": "text" }' });

    expect(mock).toFetchWithBody({ string: 'text' });
    expect(mock).toFetchWithBody('{ "string": "text" }');
    expect(mock).not.toFetchWithBody({ bar: 'foo' });
  });

  test('body with blob', async () => {
    const mock = mockFetch('POST', '/apples').willResolve();

    await callApi('/apples', { method: 'POST', body: new Blob(['1']) });

    expect(mock).toFetchWithBody(new Blob(['1']));
    expect(mock).not.toFetchWithBody(new Blob(['5', '6']));
  });

  test('body with arrayBuffer', async () => {
    const mock = mockFetch('POST', '/apples').willResolve();

    await callApi('/apples', { method: 'POST', body: new ArrayBuffer(2) });

    expect(mock).toFetchWithBody(new ArrayBuffer(2));
    expect(mock).not.toFetchWithBody(new ArrayBuffer(5));
  });
});

describe('toFetchNthTimeWithBody', () => {
  test('body with object', async () => {
    const mock = mockFetch('POST', '/apples').willResolve();

    await callApi('/apples', {
      method: 'POST',
      body: '{ "string": "text 1" }',
    });
    await callApi('/apples', {
      method: 'POST',
      body: '{ "string": "text 2" }',
    });
    await callApi('/apples', {
      method: 'POST',
      body: '{ "string": "text 3" }',
    });

    expect(mock).toFetchNthTimeWithBody(1, { string: 'text 1' });
    expect(mock).toFetchNthTimeWithBody(2, { string: 'text 2' });
    expect(mock).toFetchNthTimeWithBody(3, { string: 'text 3' });
  });
});

describe('toFetchWithQuery', () => {
  test('string query', async () => {
    const mock = mockFetch('GET', '/apples', false).willResolve();

    await callApi('/apples?count=5&offset=2');

    expect(mock).toFetchWithQuery('count=5&offset=2');
  });

  test('URLSearchParams query', async () => {
    const mock = mockFetch('GET', '/apples', false).willResolve();

    await callApi('/apples?count=5&offset=2');

    expect(mock).toFetchWithQuery(
      new URLSearchParams({ count: '5', offset: '2' })
    );
  });

  test('object query', async () => {
    const mock = mockFetch('GET', '/apples', false).willResolve();

    await callApi('/apples?count=5&offset=2');

    expect(mock).toFetchWithQuery({ count: '5', offset: '2' });
  });
});

describe('toFetchNthTimeWithQuery', () => {
  test('string query', async () => {
    const mock = mockFetch('GET', '/apples', false).willResolve();

    await callApi('/apples?count=5&offset=1');
    await callApi('/apples?count=5&offset=2');
    await callApi('/apples?count=5&offset=3');

    expect(mock).toFetchNthTimeWithQuery(1, 'count=5&offset=1');
    expect(mock).toFetchNthTimeWithQuery(2, 'count=5&offset=2');
    expect(mock).toFetchNthTimeWithQuery(3, 'count=5&offset=3');
  });
});
