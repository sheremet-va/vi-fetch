import { spyOn, SpyFn } from 'tinyspy';
import { ResponseMock } from './response';

const methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const;

type Method = typeof methods[number];

type AwaitedMockValue = (
  url: URL,
  ...args: FetchArgs
) => Promise<MockValue> | MockValue;

interface MockValue {
  body?: unknown;
  statusCode?: number;
  statusText?: string;
}

interface MockSuccessResult {
  type: 'rejects' | 'resolves' | 'do';
  value: MockValue | AwaitedMockValue;
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

  public will(
    method: Method,
    type: 'rejects' | 'resolves' | 'throws' | 'do',
    path: string | RegExp,
    includesQuery: boolean,
    once: boolean,
    value: MockValue | Error | AwaitedMockValue
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
        const fetchPath =
          !includesQuery && typeof path === 'string'
            ? urlPath.split('?')[0]
            : urlPath;
        if (typeof path === 'string' && path === fetchPath) {
          return true;
        } else if (path instanceof RegExp && path.test(fetchPath)) {
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
    let result = Mocks.getApiCall(method.toUpperCase() as Method, url);
    if (result === undefined) {
      return originalFetch(urlOrRequest, optionsOrNothing);
    }
    if (result.type === 'throws') {
      throw result.value;
    }
    const {
      body = {},
      statusCode = 200,
      statusText = 'ok',
    } = typeof result.value === 'function'
      ? await result.value(new URL(url), urlOrRequest, optionsOrNothing)
      : result.value;
    return new ResponseMock(url, body, {
      status: statusCode,
      statusText,
      headers: options.headers,
    });
  }) as typeof fetch;
}

type FetchArgs = [input: RequestInfo, init?: RequestInit | undefined];

export interface FetchSpyInstance {
  spy: SpyFn<FetchArgs, Promise<Response>>;
  baseUrl: string;
  getRouteCalls(): FetchArgs[];
  getRouteResults(): ResponseMock[];
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
  willDo(fn: AwaitedMockValue): FetchSpyInstance;
  clear(): void;
}

interface FetchSpyFn {
  (
    method: Method,
    path: string | RegExp,
    includeQuery?: boolean
  ): FetchSpyInstance;
}

interface FetchSpy extends FetchSpyFn {
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
  if (!(fetchPath instanceof RegExp)) {
    fetchPath = this.options.baseUrl + fetchPath;
  }

  function isRoute([input, options]: FetchArgs) {
    const method = options?.method || 'GET';
    if (method !== fetchMethod) return false;
    let url = typeof input === 'string' ? input : input.url;
    if (!includeQuery) {
      [url] = url.split('?');
    }
    if (typeof fetchPath === 'string' && url === fetchPath) {
      return true;
    }
    if (fetchPath instanceof RegExp) {
      return fetchPath.test(url);
    }
    return false;
  }

  function getRouteCalls() {
    return spyFetch.calls.filter(isRoute);
  }

  function getRouteResults() {
    const returns: ResponseMock[] = [];

    spyFetch.calls.forEach((call, index) => {
      if (isRoute(call)) {
        returns.push(spyFetch.returns[index] as any as ResponseMock);
      }
    });

    return returns;
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
    getRouteResults,
    getRoute: () => fetchPath,
    getMethod: () => fetchMethod,
    includesQuery: () => includeQuery,
    baseUrl: this.options.baseUrl,
    willResolveOnce<T>(returns?: T, statusCode = 200) {
      Mocks.will(fetchMethod, 'resolves', fetchPath, includeQuery, true, {
        body: returns || {},
        statusCode,
        statusText: 'ok',
      });

      return mockInstance;
    },
    willResolve<T>(returns?: T, statusCode = 200) {
      Mocks.will(fetchMethod, 'resolves', fetchPath, includeQuery, false, {
        body: returns || {},
        statusCode,
        statusText: 'ok',
      });

      return mockInstance;
    },
    willFailOnce<T>(body?: T, statusCode = 500, statusText = 'Internal error') {
      Mocks.will(fetchMethod, 'rejects', fetchPath, includeQuery, true, {
        body: body || {},
        statusCode,
        statusText,
      });

      return mockInstance;
    },
    willFail<T>(body?: T, statusCode = 500, statusText = 'Internal error') {
      Mocks.will(fetchMethod, 'rejects', fetchPath, includeQuery, false, {
        body: body || {},
        statusCode,
        statusText,
      });

      return mockInstance;
    },
    willThrowOnce(error: Error | string) {
      Mocks.will(
        fetchMethod,
        'throws',
        fetchPath,
        includeQuery,
        true,
        getError(error)
      );

      return mockInstance;
    },
    willThrow(error: Error | string) {
      Mocks.will(
        fetchMethod,
        'throws',
        fetchPath,
        includeQuery,
        false,
        getError(error)
      );

      return mockInstance;
    },
    willDo(fn: AwaitedMockValue) {
      Mocks.will(fetchMethod, 'do', fetchPath, includeQuery, false, fn);

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

const createAlias = (method: Method) =>
  spyOnFetch.bind(spyOnFetch, method) as any as FetchSpyFn;

export const mockGet = createAlias('GET');
export const mockPost = createAlias('POST');
export const mockPatch = createAlias('PATCH');
export const mockDelete = createAlias('DELETE');
export const mockPut = createAlias('PUT');

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
