import { createMockApi, prepareFetch } from '../src/api';
import { toCallApi } from '../src/matchers';

beforeAll(() => {
  prepareFetch(globalThis, 'fetch');
});

expect.extend({
  toCallApi,
});

describe('toCallApi', () => {
  const baseUrl = '';
  const { mockApi } = createMockApi({ baseUrl });

  test('api was called', async () => {
    const mock = mockApi('GET', '/apples').willResolve();

    expect(mock).not.toCallApi();

    await fetch('/apples');

    expect(mock).toCallApi();
  });

  test('api wasnt called', async () => {
    const mock = mockApi('GET', '/apples').willResolve();
    mockApi('GET', '/apples33').willFail();

    await fetch('/apples33');

    expect(mock).not.toCallApi();
  });
  test('api was called without query');
});
