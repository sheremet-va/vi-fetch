import { spyOn, SpyFn } from 'tinyspy';
import { ResponseMock } from './response';

const methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const;

type Method = typeof methods[number];

interface MockValue {
  body: unknown;
  statusCode: number;
  statusText: string;
}

interface MockSuccessResult {
  type: 'rejects' | 'resolves';
  value: MockValue;
}

type MockResult =
  | MockSuccessResult
  | {
      type: 'throws';
      value: Error;
    };

interface CallsStorage {
  method: Method;
  path: string | RegExp;
  includesQuery: boolean;
  once: boolean;
  result: MockResult;
}

class MockStorage {
  private storage: CallsStorage[] = [];

  willResolve(
    method: Method,
    path: string | RegExp,
    includesQuery: boolean,
    once: boolean,
    value: MockValue
  ) {
    return this.will(method, 'resolves', path, includesQuery, once, value);
  }

  willFail(
    method: Method,
    path: string | RegExp,
    includesQuery: boolean,
    once: boolean,
    value: MockValue
  ) {
    return this.will(method, 'rejects', path, includesQuery, once, value);
  }

  willThrow(
    method: Method,
    path: string | RegExp,
    includesQuery: boolean,
    once: boolean,
    value: Error
  ) {
    return this.will(method, 'throws', path, includesQuery, once, value);
  }

  private will(
    method: Method,
    type: 'rejects' | 'resolves' | 'throws',
    path: string | RegExp,
    includesQuery: boolean,
    once: boolean,
    value: MockValue | Error
  ) {
    this.storage.push({
      method,
      path,
      once,
      result: { type, value } as MockResult,
      includesQuery,
    });
  }

  getApiCall(fetchMethod: Method, urlPath: string) {
    const storeIndex = this.storage.findIndex(
      ({ path, method, includesQuery }) => {
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
      }
    );
    if (storeIndex === -1) {
      return undefined;
    }
    const store = this.storage[storeIndex];
    if (store.once) {
      this.storage.splice(storeIndex, 1);
    }
    return store.result;
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

interface FetchGlobals {
  global: any;
  fetchKey: string;
}

const settings: FetchGlobals = {
  global: globalThis,
  fetchKey: 'fetch',
};

export function prepareFetch(obj: any = globalThis, key: string = 'fetch') {
  settings.global = obj;
  settings.fetchKey = key;
  const originalFetch =
    obj[key] ||
    ((path: Request | string) => {
      const url = typeof path === 'string' ? path : path.url;
      throw new Error(`${key} is not defined. tried fetching "${url}"`);
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
    if (result.type === 'throws') {
      throw result.value;
    }
    const { body, statusCode, statusText } = result.value;
    return new ResponseMock(url, body, {
      status: statusCode,
      statusText,
      headers: options.headers,
    });
  }) as typeof fetch;
}

export interface FetchSpyInstance {
  spy: SpyFn<
    [input: RequestInfo, init?: RequestInit | undefined],
    Promise<Response>
  >;
  getRouteCalls(): [input: RequestInfo, init?: RequestInit | undefined][];
  getRoute(): string | RegExp;
  getMethod(): Method;
  includesQuery(): boolean;
  /**
   * Fetch will return a response with the body
   * @param returns Body of the response. By-default: {}
   * @param statusCode Status code of the response. By-default: 200
   */
  willResolve<T>(returns?: T, statusCode?: number): FetchSpyInstance;
  willResolveOnce<T>(returns?: T, statusCode?: number): FetchSpyInstance;
  /**
   * Will return a response with failed status code and body
   * @param body Body of the request. By-default: {}
   * @param statusCode Status code. By-default: 500
   * @param statusText Status text. By-default: Internal error
   */
  willFail<T>(
    body?: T,
    statusCode?: number,
    statusText?: string
  ): FetchSpyInstance;
  willFailOnce<T>(
    body?: T,
    statusCode?: number,
    statusText?: string
  ): FetchSpyInstance;
  /**
   * Fetch will throw an error instead of returning a response
   * @param err Thrown error or a message of error to throw
   */
  willThrow(err: Error | string): FetchSpyInstance;
  willThrowOnce(err: Error | string): FetchSpyInstance;
  clear(): void;
}

interface FetchSpy {
  (
    method: Method,
    path: string | RegExp,
    includeQuery?: boolean
  ): FetchSpyInstance;
  clearAll(): void;
  options: MockOptions;
  setOptions(o: Partial<MockOptions>): void;
}

function spyOnFetch(
  this: { options: MockOptions },
  fetchMethod: Method,
  fetchPath: string | RegExp,
  includeQuery = true
) {
  const spyFetch = spyOn<{ fetch: typeof fetch }, 'fetch'>(
    settings.global,
    settings.fetchKey as 'fetch'
  );
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

  const getError = (err: Error | string) => {
    if (typeof err === 'string') {
      return new TypeError(err);
    }
    return err;
  };

  const mockInstance = {
    spy: spyFetch,
    getRouteCalls,
    getRoute: () => fetchPath,
    getMethod: () => fetchMethod,
    includesQuery: () => includeQuery,
    willResolveOnce<T>(returns?: T, statusCode = 200) {
      Mocks.willResolve(fetchMethod, fetchPath, includeQuery, true, {
        body: returns || {},
        statusCode,
        statusText: 'ok',
      });

      return mockInstance;
    },
    willResolve<T>(returns?: T, statusCode = 200) {
      Mocks.willResolve(fetchMethod, fetchPath, includeQuery, false, {
        body: returns || {},
        statusCode,
        statusText: 'ok',
      });

      return mockInstance;
    },
    willFailOnce<T>(body?: T, statusCode = 500, statusText = 'Internal error') {
      Mocks.willFail(fetchMethod, fetchPath, includeQuery, true, {
        body: body || {},
        statusCode,
        statusText,
      });

      return mockInstance;
    },
    willFail<T>(body?: T, statusCode = 500, statusText = 'Internal error') {
      Mocks.willFail(fetchMethod, fetchPath, includeQuery, false, {
        body: body || {},
        statusCode,
        statusText,
      });

      return mockInstance;
    },
    willThrowOnce(error: Error | string) {
      Mocks.willThrow(
        fetchMethod,
        fetchPath,
        includeQuery,
        true,
        getError(error)
      );

      return mockInstance;
    },
    willThrow(error: Error | string) {
      Mocks.willThrow(
        fetchMethod,
        fetchPath,
        includeQuery,
        false,
        getError(error)
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

interface MockOptions extends FetchGlobals {
  baseUrl: string;
}

function setGlobals(globals: Partial<FetchGlobals>) {
  Object.assign(settings, globals);
}

spyOnFetch.clearAll = Mocks.clearAll.bind(Mocks);
spyOnFetch.options = {
  baseUrl: '',
  get global() {
    return settings.global;
  },
  get fetchKey() {
    return settings.fetchKey;
  },
} as MockOptions;

spyOnFetch.setOptions = (options: Partial<MockOptions>) => {
  if (typeof options.baseUrl === 'string') {
    spyOnFetch.options.baseUrl = options.baseUrl;
  }
  setGlobals(options);
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

export function createMockApi({
  baseUrl = '',
  global = settings.global,
  fetchKey = settings.fetchKey,
}: Partial<MockOptions> = {}) {
  const options = { baseUrl, global, fetchKey };

  const mockApi = spyOnFetch.bind({ options }) as any as FetchSpy;

  mockApi.options = options;
  mockApi.clearAll = spyOnFetch.clearAll;
  mockApi.setOptions = (opts: Partial<MockOptions>) => {
    if (typeof options.baseUrl === 'string') {
      mockApi.options.baseUrl = options.baseUrl;
    }
    setGlobals(opts);
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
