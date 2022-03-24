import { SpyImpl } from 'tinyspy';
import type {
  AwaitedMockValue,
  HeadersMockInit,
  Method,
  MockValue,
} from './api.js';
import { Mocks } from './api.js';
import { HeadersMock } from './headers.js';
import { ResponseMock } from './response.js';
import { getStatusText } from './statuses.js';
import { guessContentType } from './utils.js';

interface MockInstanceOptions {
  method: Method;
  url: string | RegExp;
  includeQuery: boolean;
  baseUrl: string;
  spy: SpyImpl<FetchArgs, Promise<Response>>;
  headers: HeadersMock;
}

export type FetchArgs = [input: RequestInfo, init?: RequestInit | undefined];

export interface FetchSpyInstance {
  spy: SpyImpl<FetchArgs, Promise<Response>>;
  baseUrl: string;
  getRouteCalls(): FetchArgs[];
  getRouteResponses(): ResponseMock[];
  getRouteResults<T = unknown>(): T[];
  getRoute(): string | RegExp;
  getMethod(): Method;
  /**
   * All requests will return this headers in Response object. If no headers are given,
   * will try to guess if from `returns` or `failes` values.
   * @default array [['Content-Type', 'application/json']]
   * @param headers Headers to set
   */
  withHeaders(headers: HeadersMockInit): FetchSpyInstance;
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
  willDo(
    fn: (url: URL, ...args: FetchArgs) => Promise<MockValue> | MockValue
  ): FetchSpyInstance;
  clear(): void;
}

const getError = (err: Error | string) => {
  if (typeof err === 'string') {
    return new TypeError(err);
  }
  return err;
};

export class FetchMockInstance implements FetchSpyInstance {
  public willResolveOnce: FetchSpyInstance['willResolveOnce'];
  public willResolve: FetchSpyInstance['willResolve'];
  public willFailOnce: FetchSpyInstance['willFailOnce'];
  public willFail: FetchSpyInstance['willFail'];
  public willThrowOnce: FetchSpyInstance['willThrowOnce'];
  public willThrow: FetchSpyInstance['willThrow'];

  constructor(private options: MockInstanceOptions) {
    this.willResolveOnce = this.createWillResolve(true);
    this.willResolve = this.createWillResolve(false);
    this.willFailOnce = this.createWillFail(true);
    this.willFail = this.createWillFail(false);
    this.willThrowOnce = this.createWillThrow(true);
    this.willThrow = this.createWillThrow(false);
  }

  public getRoute() {
    return this.options.url;
  }

  public getMethod() {
    return this.options.method;
  }

  public get spy() {
    return this.options.spy;
  }

  public get baseUrl() {
    return this.options.baseUrl;
  }

  public getRouteCalls(): FetchArgs[] {
    return this.options.spy.calls.filter((args) => this.isRoute(args));
  }

  public getRouteResponses() {
    const returns: ResponseMock[] = [];

    this.spy.calls.forEach((call, index) => {
      if (this.isRoute(call)) {
        returns.push(this.spy.returns[index] as any as ResponseMock);
      }
    });

    return returns;
  }

  public getRouteResults<T = unknown>() {
    return this.getRouteResponses().map((v) => v.value) as T[];
  }

  public withHeaders(headers: HeadersMockInit): FetchSpyInstance {
    this.options.headers = new HeadersMock(headers);
    return this;
  }

  public willDo(fn: AwaitedMockValue) {
    Object.defineProperty(fn, 'headers', {
      get: () => this.options.headers,
    });

    Mocks.will(
      this.getMethod(),
      'do',
      this.getRoute(),
      this.options.includeQuery,
      false,
      fn
    );

    return this;
  }

  clear() {
    Mocks.clear(this.getMethod(), this.getRoute());

    return this;
  }

  private setContentType(obj: unknown) {
    if (!this.options.headers.has('Content-Type')) {
      this.options.headers.set('Content-Type', guessContentType(obj || {}));
    }
  }

  private createWillThrow(once: boolean) {
    return (error: Error | string) => {
      Mocks.will(
        this.getMethod(),
        'throws',
        this.getRoute(),
        this.options.includeQuery,
        once,
        getError(error)
      );

      return this;
    };
  }

  private createWillResolve(once: boolean) {
    return <T>(returns?: T, statusCode = 200) => {
      this.setContentType(returns);

      Mocks.will(
        this.getMethod(),
        'resolves',
        this.getRoute(),
        this.options.includeQuery,
        once,
        {
          body: returns || {},
          statusCode,
          statusText: getStatusText(statusCode),
          headers: this.options.headers,
        }
      );

      return this;
    };
  }

  private createWillFail(once: boolean) {
    return <T>(body?: T, statusCode = 500, statusText?: string) => {
      this.setContentType(body);

      Mocks.will(
        this.getMethod(),
        'rejects',
        this.getRoute(),
        this.options.includeQuery,
        once,
        {
          body: body || {},
          statusCode,
          statusText: statusText || getStatusText(statusCode),
          headers: this.options.headers,
        }
      );

      return this;
    };
  }

  private isRoute([input, options]: FetchArgs) {
    const fetchPath = this.getRoute();
    const method = options?.method || 'GET';
    if (method !== this.options.method) return false;
    let url = typeof input === 'string' ? input : input.url;
    if (!this.options.includeQuery) {
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
}
