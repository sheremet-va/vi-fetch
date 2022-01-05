import '../src/extend';
import { prepareFetch, mockApi } from '../src/api';

beforeAll(() => {
  prepareFetch(globalThis, 'fetch');
  mockApi.setOptions({ baseUrl: 'https://api.com' });
});

beforeEach(() => {
  mockApi.clearAll();
});

const callApi = (url: string, ...args: [options?: RequestInit]) => {
  return fetch(`https://api.com${url}`, ...args);
};

describe('toFetch', () => {
  test('api was called', async () => {
    const mock = mockApi('GET', '/apples').willResolve();

    expect(mock).not.toFetch();

    await callApi('/apples');

    expect(mock).toFetch();
  });

  test('api wasnt called', async () => {
    const mock = mockApi('GET', '/apples').willResolve();
    mockApi('GET', '/apples33').willFail();

    await callApi('/apples33');

    expect(mock).not.toFetch();
  });

  test('api was called with query', async () => {
    const mock = mockApi('GET', '/apples?count=3').willResolve();

    expect(fetch('/apples')).rejects.toThrowError();

    await callApi('/apples?count=3');

    expect(mock).toFetch();
  });

  test('api was called with query but mock wihout', async () => {
    const mock = mockApi('GET', '/apples').willResolve();

    expect(fetch('/apples?count=2')).rejects.toThrowError();

    await callApi('/apples');

    expect(mock).toFetch();
  });

  test('api was called without query', async () => {
    const mock = mockApi('GET', '/apples', false).willResolve();

    await callApi('/apples?count=3');

    expect(mock).toFetch();
  });
});

describe('toFetchTimes', () => {
  test('api called nth times', async () => {
    const mock = mockApi('GET', '/apples').willResolve();

    expect(mock).toFetchTimes(0);

    await callApi('/apples');
    await callApi('/apples');
    await callApi('/apples');

    expect(fetch('/apples?count=5')).rejects.toThrowError();

    expect(mock).not.toFetchTimes(0);
    expect(mock).toFetchTimes(3);
  });

  test('api called nth times with no query', async () => {
    const mock = mockApi('GET', '/apples', false).willResolve();

    expect(mock).toFetchTimes(0);

    await callApi('/apples?count=5');
    await callApi('/apples?count=1');
    await callApi('/apples?count=3');

    expect(mock).toFetchTimes(3);
  });
});

describe('toFetchWithBody', () => {
  test('body with string', async () => {
    const mock = mockApi('POST', '/apples').willResolve();

    await callApi('/apples', { method: 'POST', body: 'text' });

    expect(mock).toFetchWithBody('text');
    expect(mock).not.toFetchWithBody('zoo');
  });

  test('body with object', async () => {
    const mock = mockApi('POST', '/apples').willResolve();

    await callApi('/apples', { method: 'POST', body: '{ "string": "text" }' });

    expect(mock).toFetchWithBody({ string: 'text' });
    expect(mock).not.toFetchWithBody({ bar: 'foo' });
  });

  test('body with blob', async () => {
    const mock = mockApi('POST', '/apples').willResolve();

    await callApi('/apples', { method: 'POST', body: new Blob(['1']) });

    expect(mock).toFetchWithBody(new Blob(['1']));
    expect(mock).not.toFetchWithBody(new Blob(['5', '6']));
  });

  test('body with arrayBuffer', async () => {
    const mock = mockApi('POST', '/apples').willResolve();

    await callApi('/apples', { method: 'POST', body: new ArrayBuffer(2) });

    expect(mock).toFetchWithBody(new ArrayBuffer(2));
    expect(mock).not.toFetchWithBody(new ArrayBuffer(5));
  });
});

describe('toFetchWithQuery', () => {
  test('string query', async () => {
    const mock = mockApi('GET', '/apples', false).willResolve();

    await callApi('/apples?count=5&offset=2');

    expect(mock).toFetchWithQuery('count=5&offset=2');
  });

  test('URLSearchParams query', async () => {
    const mock = mockApi('GET', '/apples', false).willResolve();

    await callApi('/apples?count=5&offset=2');

    expect(mock).toFetchWithQuery(
      new URLSearchParams({ count: '5', offset: '2' })
    );
  });

  test('object query', async () => {
    const mock = mockApi('GET', '/apples', false).willResolve();

    await callApi('/apples?count=5&offset=2');

    expect(mock).toFetchWithQuery({ count: '5', offset: '2' });
  });
});
