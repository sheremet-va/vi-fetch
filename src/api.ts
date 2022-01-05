import { spyOn } from 'tinyspy';
import { HeadersMock } from './headers';
import { FetchMockInstance, FetchSpyInstance } from './mock';
import { ResponseMock } from './response';

const methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'] as const;

export type Method = typeof methods[number];
export type HeadersMockInit =
  | Record<string, string | number | boolean>
  | Headers
  | string[][];

export interface AwaitedMockValue {
  (url: URL, ...args: FetchArgs): Promise<MockValue> | MockValue;
  headers: HeadersMockInit;
}

export interface MockValue {
  body?: unknown;
  statusCode?: number;
  statusText?: string;
  headers?: HeadersMockInit;
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

async function getDataFromMockResult(
  result: MockSuccessResult,
  url: string,
  [input, init]: FetchArgs
) {
  const defaults = {
    body: {},
    statusCode: 200,
    statusText: 'OK',
    headers: [['Content-Type', 'application/json']],
  };

  if (typeof result.value !== 'function') {
    return { ...defaults, ...result.value };
  }

  const headers = result.value.headers;
  const data = await result.value(new URL(url), input, init);

  return {
    ...defaults,
    headers,
    ...data,
  };
}

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
    const { body, statusCode, statusText, headers } =
      await getDataFromMockResult(result, url, [
        urlOrRequest,
        optionsOrNothing,
      ]);
    return new ResponseMock(url, body, {
      status: statusCode,
      statusText,
      headers: new HeadersMock(headers),
    });
  }) as typeof fetch;
}

type FetchArgs = [input: RequestInfo, init?: RequestInit | undefined];

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

  return new FetchMockInstance({
    method: fetchMethod,
    url: fetchPath,
    includeQuery: includeQuery,
    baseUrl: this.options.baseUrl,
    spy: spyFetch,
    headers: new HeadersMock(),
  });
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
