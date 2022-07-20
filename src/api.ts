import { spyOn } from 'tinyspy';
import { HeadersMock } from './headers.js';
import { FetchMockInstance } from './mock.js';
import type { FetchArgs, FetchSpyInstance } from './mock.js';
import { ResponseMock } from './response.js';

const methods = ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'HEAD'] as const;

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
  result: MockResult;
}

function createStoragePredicate(fetchMethod: Method, urlPath: string) {
  return ({ path, method, includesQuery }: CallsStorage) => {
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
  };
}

class MockStorage {
  private storage: CallsStorage[] = [];
  private onceStorage: CallsStorage[] = [];

  public will(
    method: Method,
    type: 'rejects' | 'resolves' | 'throws' | 'do',
    path: string | RegExp,
    includesQuery: boolean,
    once: boolean,
    value: MockValue | Error | AwaitedMockValue
  ) {
    // remove previous "will" (don't remove `Once`)
    this.clear(method, path, false);
    const item: CallsStorage = {
      method,
      path,
      result: { type, value } as MockResult,
      includesQuery,
    };
    if (once) {
      this.onceStorage.push(item);
    } else {
      this.storage.push(item);
    }
  }

  getApiCall(fetchMethod: Method, urlPath: string) {
    const predicate = createStoragePredicate(fetchMethod, urlPath);
    const itemIndexOnce = this.onceStorage.findIndex(predicate);
    if (itemIndexOnce > -1) {
      const item = this.onceStorage[itemIndexOnce];
      this.onceStorage.splice(itemIndexOnce, 1);
      return item.result;
    }
    const itemIndex = this.storage.findIndex(predicate);
    if (itemIndex === -1) {
      return undefined;
    }
    const item = this.storage[itemIndex];
    return item.result;
  }

  clear(fetchMethod: Method, fetchUrl: string | RegExp, removeOnce = true) {
    const predicate = ({ method, path }: CallsStorage) => {
      return method !== fetchMethod || path !== fetchUrl;
    };
    this.storage = this.storage.filter(predicate);
    if (removeOnce) {
      this.onceStorage = this.onceStorage.filter(predicate);
    }
    return this;
  }

  clearAll() {
    this.storage = [];
    this.onceStorage = [];
    return this;
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
      typeof urlOrRequest === 'string'
        ? urlOrRequest
        : 'href' in urlOrRequest
        ? urlOrRequest.href
        : urlOrRequest.url;
    const options =
      typeof optionsOrNothing !== 'undefined'
        ? optionsOrNothing
        : { method: 'GET' };
    const method =
      typeof urlOrRequest !== 'string' && !('href' in urlOrRequest)
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

interface FetchSpyFn {
  (
    method: Method,
    path: string | RegExp,
    includeQuery?: boolean
  ): FetchSpyInstance;
}

interface FetchSpyFnShort {
  (path: string | RegExp, includeQuery?: boolean): FetchSpyInstance;
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

export const mockFetch = spyOnFetch.bind(spyOnFetch) as any as FetchSpy;

mockFetch.clearAll = spyOnFetch.clearAll;
mockFetch.options = spyOnFetch.options;
mockFetch.setOptions = spyOnFetch.setOptions;

const createAlias = (method: Method) =>
  spyOnFetch.bind(spyOnFetch, method) as any as FetchSpyFnShort;

export const mockGet = createAlias('GET');
export const mockPost = createAlias('POST');
export const mockPatch = createAlias('PATCH');
export const mockDelete = createAlias('DELETE');
export const mockPut = createAlias('PUT');
export const mockHead = createAlias('HEAD');

export function createMockFetch({
  baseUrl = '',
  global = settings.global,
  fetchKey = settings.fetchKey,
}: Partial<MockOptions> = {}) {
  const options = { baseUrl, global, fetchKey };

  const mockFetch = spyOnFetch.bind({ options }) as any as FetchSpy;

  mockFetch.options = options;
  mockFetch.clearAll = spyOnFetch.clearAll;
  mockFetch.setOptions = (opts: Partial<MockOptions>) => {
    if (typeof options.baseUrl === 'string') {
      mockFetch.options.baseUrl = options.baseUrl;
    }
    setGlobals(opts);
  };

  const createAlias = (method: Method) => {
    return mockFetch.bind(mockFetch, method) as FetchSpyFnShort;
  };

  return {
    mockFetch,
    mockGet: createAlias('GET'),
    mockPost: createAlias('POST'),
    mockPatch: createAlias('PATCH'),
    mockDelete: createAlias('DELETE'),
    mockPut: createAlias('PUT'),
    mockHead: createAlias('HEAD'),
  };
}
