import { spy, SpyFn } from 'tinyspy';
import { ResponseMock } from './response';

const methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const;

type Method = typeof methods[number];

const toArray = <T>(obj: T | T[]): T[] => {
  if (Array.isArray(obj)) {
    return obj;
  }

  return [obj];
};

interface MockResult {
  type: 'rejects' | 'resolves';
  value: unknown;
}

interface CallsStorage {
  method: Method;
  path: string | RegExp;
  includesQuery: boolean;
  results: MockResult[];
}

class MockStorage {
  private storage: CallsStorage[] = [];

  willResolve(
    method: Method,
    path: string | RegExp,
    includesQuery: boolean,
    value: unknown | unknown[]
  ) {
    return this.will(method, 'resolves', path, includesQuery, value);
  }

  willFail(
    method: Method,
    path: string | RegExp,
    includesQuery: boolean,
    value: unknown | unknown[]
  ) {
    return this.will(method, 'rejects', path, includesQuery, value);
  }

  private will(
    method: Method,
    type: 'rejects' | 'resolves',
    path: string | RegExp,
    includesQuery: boolean,
    value: unknown | unknown[]
  ) {
    const results: MockResult[] = toArray(value).map((value) => ({
      type,
      value,
    }));

    this.storage.push({ method, path, results, includesQuery });
  }

  getApiCall(fetchMethod: Method, urlPath: string) {
    const store = this.storage.find(({ path, method, includesQuery }) => {
      if (fetchMethod !== method) return false;
      if (!includesQuery && typeof path === 'string') {
        [path] = path.split('?');
      }
      if (typeof path === 'string' && path === urlPath) {
        return true;
      } else if (path instanceof RegExp && path.test(urlPath)) {
        return true;
      }
      return false;
    });
    if (!store) {
      return undefined;
    }
    if (store.results.length === 1) {
      return store.results[0];
    }
    return store.results.pop();
  }

  clear(fetchMethod: Method, fetchUrl: string | RegExp) {
    this.storage = this.storage.filter(({ method, path }) => {
      return method !== fetchMethod && path !== fetchUrl;
    });
  }

  clearAll() {
    this.storage = [];
  }
}

export const Mocks = new MockStorage();

const settings = {
  global: globalThis as any,
  fetchKey: 'fetch',
};

export function prepareFetch(obj: any = globalThis, key: string = 'fetch') {
  settings.global = obj;
  settings.fetchKey = key;
  const originalFetch =
    obj[key] ||
    ((path: Request | string) => {
      const url = typeof path === 'string' ? path : path.url;
      throw new Error(`fetch is not defined. tried fetching "${url}"`);
    });
  obj[key] = (async (urlOrRequest, optionsOrNothing) => {
    const url =
      typeof urlOrRequest === 'string' ? urlOrRequest : urlOrRequest.url;
    const options =
      typeof optionsOrNothing !== 'undefined'
        ? optionsOrNothing
        : { method: 'GET' };
    const method =
      typeof urlOrRequest !== 'string'
        ? urlOrRequest.method
        : options.method || 'GET';
    const result = Mocks.getApiCall(method.toUpperCase() as Method, url);
    if (result === undefined) {
      return originalFetch(urlOrRequest, optionsOrNothing);
    }
    // TODO rejects - status code, not throw
    if (result.type === 'rejects') {
      throw result.value;
    }
    return new ResponseMock(url, result.value, {
      status: 200,
      statusText: 'ok',
      headers: options.headers,
    });
  }) as typeof fetch;
}

interface FetchSpyInstance {
  spy: SpyFn<
    [input: RequestInfo, init?: RequestInit | undefined],
    Promise<Response>
  >;
  getRouteCalls: () => [input: RequestInfo, init?: RequestInit | undefined][];
  getRoute: () => string | RegExp;
  getMethod: () => Method;
  includesQuery: () => boolean;
  willResolve: <T>(returns?: T) => FetchSpyInstance;
  willFail: <T>(throws?: T) => FetchSpyInstance;
  clear: () => void;
}

interface FetchSpy {
  (
    method: Method,
    path: string | RegExp,
    includeQuery?: boolean
  ): FetchSpyInstance;
  clearAll: () => void;
  options: MockOptions;
  setOptions: (o: Partial<MockOptions>) => void;
}

function spyOnFetch(
  this: { options: MockOptions },
  fetchMethod: Method,
  fetchPath: string | RegExp,
  includeQuery = true
) {
  const spyFetch = spy(settings.global[settings.fetchKey] as typeof fetch);
  fetchPath = this.options.baseUrl + fetchPath;

  function getRouteCalls() {
    return spyFetch.calls.filter(([input, options]) => {
      const method = options?.method || 'GET';
      if (method !== fetchMethod) return false;
      let url = typeof input === 'string' ? input : input.url;
      if (!includeQuery) {
        [url] = url.split('?');
      }
      if (typeof fetchPath === 'string' && input === fetchPath) {
        return true;
      }
      if (fetchPath instanceof RegExp) {
        return fetchPath.test(url);
      }
      return false;
    });
  }

  const mockInstance = {
    spy: spyFetch,
    getRouteCalls,
    getRoute: () => fetchPath,
    getMethod: () => fetchMethod,
    includesQuery: () => includeQuery,
    willResolve<T>(returns?: T) {
      Mocks.willResolve(fetchMethod, fetchPath, includeQuery, returns || {});

      return mockInstance;
    },
    willFail<T>(throws?: T) {
      Mocks.willFail(
        fetchMethod,
        fetchPath,
        includeQuery,
        throws || new Error()
      );

      return mockInstance;
    },
    clear() {
      Mocks.clear(fetchMethod, fetchPath);

      return mockInstance;
    },
  };

  return mockInstance;
}

interface MockOptions {
  baseUrl: string;
}

spyOnFetch.clearAll = Mocks.clearAll.bind(Mocks);
spyOnFetch.options = {
  baseUrl: '',
} as MockOptions;

spyOnFetch.setOptions = (options: Partial<MockOptions>) => {
  Object.assign(spyOnFetch.options, options);
};

export const mockApi = spyOnFetch.bind(spyOnFetch) as any as FetchSpy;

mockApi.clearAll = spyOnFetch.clearAll;
mockApi.options = spyOnFetch.options;
mockApi.setOptions = spyOnFetch.setOptions;

export const mockGet = spyOnFetch.bind(spyOnFetch, 'GET');
export const mockPost = spyOnFetch.bind(spyOnFetch, 'POST');
export const mockPatch = spyOnFetch.bind(spyOnFetch, 'PATCH');
export const mockDelete = spyOnFetch.bind(spyOnFetch, 'DELETE');
export const mockPut = spyOnFetch.bind(spyOnFetch, 'PUT');

export function createMockApi({ baseUrl = '' }: Partial<MockOptions> = {}) {
  const options = { baseUrl };

  const mockApi = spyOnFetch.bind({ options }) as any as FetchSpy;

  mockApi.options = options;
  mockApi.clearAll = spyOnFetch.clearAll;
  mockApi.setOptions = (opts: Partial<MockOptions>) => {
    Object.assign(options, opts);
  };

  return {
    mockApi,
    mockGet: mockApi.bind(mockApi, 'GET'),
    mockPost: mockApi.bind(mockApi, 'POST'),
    mockPatch: mockApi.bind(mockApi, 'PATCH'),
    mockDelete: mockApi.bind(mockApi, 'DELETE'),
    mockPut: mockApi.bind(mockApi, 'PUT'),
  };
}
