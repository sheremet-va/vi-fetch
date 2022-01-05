import { FetchSpyInstance } from './api';
import { parse as parseQuery } from 'query-string';

interface JestUtils {
  isNot: boolean;
  equals: (a: any, b: any, matchers?: any[], strict?: boolean) => boolean;
  utils: {
    matcherHint(matcher: string, actual: string, recieved: string): string;
    EXPECTED_COLOR(text: string): string;
    RECEIVED_COLOR(text: string): string;
    printReceived(obj: any): string;
    printExpected(obj: any): string;
  };
}

const arrayBufferEquality = (a: unknown, b: unknown): boolean | undefined => {
  if (!(a instanceof ArrayBuffer) || !(b instanceof ArrayBuffer))
    return undefined;

  const dataViewA = new DataView(a);
  const dataViewB = new DataView(b);

  // Buffers are not equal when they do not have the same byte length
  if (dataViewA.byteLength !== dataViewB.byteLength) return false;

  // Check if every byte value is equal to each other
  for (let i = 0; i < dataViewA.byteLength; i++) {
    if (dataViewA.getUint8(i) !== dataViewB.getUint8(i)) return false;
  }

  return true;
};

const blobEquality = (a: unknown, b: unknown): boolean | undefined => {
  if (!(a instanceof Blob) || !(b instanceof Blob)) return undefined;
  if (a.size !== b.size || a.type !== b.type) {
    return false;
  }
  return undefined;
};

const pluralize = (n: number, str: string) => {
  if (n === 1) {
    return `1 ${str}`;
  }
  return `${n} ${str}s`;
};

const isSpyInstance = (actual: unknown): actual is FetchSpyInstance => {
  if (
    typeof actual === 'object' &&
    actual &&
    'spy' in actual &&
    (actual as any).spy.__isSpy
  ) {
    return true;
  }
  return false;
};

const assertSpy = (actual: unknown) => {
  if (!isSpyInstance(actual)) {
    throw new TypeError('expected value is not an instance of mockApi');
  }
};

const printApiCalls = (
  actual: FetchSpyInstance,
  print: (obj: any) => string
) => {
  return [
    '',
    '  API calls:',
    '',
    ...(!actual.spy.calls.length
      ? ['No API calls']
      : actual.spy.calls.map((args, i) => {
          return i + 1 + '. ' + print(args);
        })),
  ].join('\n');
};

export function toFetch(this: JestUtils, actual: FetchSpyInstance) {
  assertSpy(actual);
  const calls = actual.getRouteCalls();
  const route = actual.getRoute();
  const pass = calls.length > 0;
  return {
    pass,
    message: () => {
      return [
        this.utils.matcherHint(
          `${this.isNot ? '.not' : ''}.toFetch`,
          'api',
          ''
        ),
        '',
        'Expected:',
        `  Route "${this.utils.EXPECTED_COLOR(String(route))}" ${
          this.isNot ? 'to never be called' : 'to be called at least once'
        }.`,
        'Received:',
        printApiCalls(actual, this.utils.printReceived),
      ].join('\n');
    },
  };
}

export function toFetchTimes(
  this: JestUtils,
  actual: FetchSpyInstance,
  times: number
) {
  assertSpy(actual);
  const calls = actual.getRouteCalls();
  const route = actual.getRoute();
  const pass = calls.length === times;
  return {
    pass,
    message: () => {
      return [
        this.utils.matcherHint(
          `${this.isNot ? '.not' : ''}.toFetchTimes`,
          'api',
          'times'
        ),
        '',
        'Expected:',
        `  Route "${this.utils.EXPECTED_COLOR(String(route))}" to have${
          this.isNot ? ' not' : ''
        } been called ${pluralize(times, 'time')}.`,
        'Received:',
        printApiCalls(actual, this.utils.printReceived),
      ].join('\n');
    },
  };
}

// TODO
// export function toFetchWithHeaders(
//   this: JestUtils,
//   actual: FetchSpyInstance,
//   headers: Record<string, string | number | undefined> | Headers
// ) {}

export function toFetchWithBody(
  this: JestUtils,
  actual: FetchSpyInstance,
  expectedBody: any
) {
  assertSpy(actual);
  const calls = actual.getRouteCalls();
  const route = actual.getRoute();
  const pass = calls.some(([, init]) => {
    if (!init) return false;
    const body = init.body;
    if (!body) return false;
    if (typeof body === 'string') {
      if (typeof expectedBody === 'string') return body === expectedBody;
      try {
        return this.equals(JSON.parse(body), expectedBody);
      } catch {
        return false;
      }
    }
    if (typeof expectedBody === 'string') return false;
    return this.equals(
      body,
      expectedBody,
      [arrayBufferEquality, blobEquality],
      true
    );
  });
  return {
    pass,
    message: () => {
      return [
        this.utils.matcherHint(
          `${this.isNot ? '.not' : ''}.toFetchWithBody`,
          'api',
          'body'
        ),
        '',
        'Expected:',
        `  Route "${this.utils.EXPECTED_COLOR(String(route))}" to have${
          this.isNot ? ' not' : ''
        } been called with body ${this.utils.printExpected(expectedBody)}.`,
        'Received:',
        printApiCalls(actual, this.utils.printReceived),
      ].join('\n');
    },
  };
}
export function toFetchWithQuery(
  this: JestUtils,
  actual: FetchSpyInstance,
  expectedQuery: string | Record<string, any> | URLSearchParams
) {
  assertSpy(actual);
  const calls = actual.getRouteCalls();
  const route = actual.getRoute();
  const expectedQueryObj =
    typeof expectedQuery === 'string'
      ? parseQuery(expectedQuery)
      : expectedQuery;

  const pass = calls.some(([input]) => {
    const url = typeof input === 'string' ? input : input.url;
    const uri = new URL(url);
    if (expectedQueryObj instanceof URLSearchParams) {
      return expectedQueryObj.toString() === uri.searchParams.toString();
    }
    return this.equals(expectedQueryObj, parseQuery(uri.search));
  });
  return {
    pass,
    message: () => {
      return [
        this.utils.matcherHint(
          `${this.isNot ? '.not' : ''}.toFetchWithQuery`,
          'api',
          'query'
        ),
        '',
        'Expected:',
        `  Route "${this.utils.EXPECTED_COLOR(String(route))}" to have${
          this.isNot ? ' not' : ''
        } been called with query:`,
        '',
        this.utils.printExpected(expectedQuery),
        'Received:',
        printApiCalls(actual, this.utils.printReceived),
      ].join('\n');
    },
  };
}
