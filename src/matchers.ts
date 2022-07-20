import { parse as parseQuery } from 'query-string';
import type { FetchSpyInstance } from './mock.js';

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
    (actual as any).spy._isMockFunction
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

export function toFetch(
  this: JestUtils,
  actual: FetchSpyInstance,
  response?: unknown
) {
  assertSpy(actual);
  const calls = actual.getRouteCalls();
  const route = actual.getRoute();
  let pass = calls.length > 0;
  if (pass && typeof response !== 'undefined') {
    const results = actual.getRouteResults();
    pass = results.some((r) => this.equals(r, response));
  }
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

export function toFetchNthTime(
  this: JestUtils,
  actual: FetchSpyInstance,
  time: number,
  response: unknown
) {
  assertSpy(actual);
  const route = actual.getRoute();
  const results = actual.getRouteResults();
  const pass = this.equals(results[time - 1], response);
  return {
    pass,
    actual: results[time - 1],
    expected: response,
    message: () => {
      return [
        this.utils.matcherHint(
          `${this.isNot ? '.not' : ''}.toFetchNthTime`,
          'api',
          'time, response'
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

function bodyEquals(
  expectedBody: any,
  init: RequestInit | undefined,
  equals: JestUtils['equals']
) {
  if (!init) return false;
  const body = init.body;
  if (!body) return false;
  if (typeof body === 'string') {
    if (typeof expectedBody === 'string') return body === expectedBody;
    try {
      return equals(JSON.parse(body), expectedBody);
    } catch {
      return false;
    }
  }
  if (typeof expectedBody === 'string') return false;
  return equals(body, expectedBody, [arrayBufferEquality, blobEquality], true);
}

export function toFetchWithBody(
  this: JestUtils,
  actual: FetchSpyInstance,
  expectedBody: any
) {
  assertSpy(actual);
  const calls = actual.getRouteCalls();
  const route = actual.getRoute();
  const pass = calls.some(([, init]) => {
    return bodyEquals(expectedBody, init, this.equals);
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

export function toFetchNthTimeWithBody(
  this: JestUtils,
  actual: FetchSpyInstance,
  time: number,
  expectedBody: any
) {
  assertSpy(actual);
  const calls = actual.getRouteCalls();
  const route = actual.getRoute();
  const pass =
    calls[time - 1] &&
    bodyEquals(expectedBody, calls[time - 1][1], this.equals);
  return {
    pass,
    message: () => {
      return [
        this.utils.matcherHint(
          `${this.isNot ? '.not' : ''}.toFetchNthTimeWithBody`,
          'api',
          ''
        ),
        '',
        'Expected:',
        `  Route "${this.utils.EXPECTED_COLOR(String(route))}" to have${
          this.isNot ? ' not' : ''
        } been called ${time} time with body ${this.utils.printExpected(
          expectedBody
        )}.`,
        'Received:',
        printApiCalls(actual, this.utils.printReceived),
      ].join('\n');
    },
  };
}

function createQueryComparison(
  expectedQuery: any,
  equals: JestUtils['equals']
) {
  const expectedQueryObj =
    typeof expectedQuery === 'string'
      ? parseQuery(expectedQuery)
      : expectedQuery;
  return ([input]: [string | Request | URL, ...any]) => {
    const url =
      typeof input === 'string'
        ? input
        : 'href' in input
        ? input.href
        : input.url;
    const uri = new URL(url);
    if (expectedQueryObj instanceof URLSearchParams) {
      return expectedQueryObj.toString() === uri.searchParams.toString();
    }
    return equals(expectedQueryObj, parseQuery(uri.search));
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
  const queryEquals = createQueryComparison(expectedQuery, this.equals);

  const pass = calls.some(queryEquals);
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

export function toFetchNthTimeWithQuery(
  this: JestUtils,
  actual: FetchSpyInstance,
  time: number,
  expectedQuery: string | Record<string, any> | URLSearchParams
) {
  assertSpy(actual);
  const calls = actual.getRouteCalls();
  const route = actual.getRoute();
  const queryEquals = createQueryComparison(expectedQuery, this.equals);

  const pass = calls[time - 1] && queryEquals(calls[time - 1]);
  return {
    pass,
    message: () => {
      return [
        this.utils.matcherHint(
          `${this.isNot ? '.not' : ''}.toFetchNthTimeWithQuery`,
          'api',
          ''
        ),
        '',
        'Expected:',
        `  Route "${this.utils.EXPECTED_COLOR(String(route))}" to have${
          this.isNot ? ' not' : ''
        } been called ${time} time with query:`,
        '',
        this.utils.printExpected(expectedQuery),
        'Received:',
        printApiCalls(actual, this.utils.printReceived),
      ].join('\n');
    },
  };
}
