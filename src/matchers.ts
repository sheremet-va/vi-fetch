import { FetchSpyInstance } from './api';

interface JestUtils {
  isNot: boolean;
  equals: (a: any, b: any) => boolean;
  utils: {
    matcherHint(matcher: string, actual: string, recieved: string): string;
    EXPECTED_COLOR(text: string): string;
    RECEIVED_COLOR(text: string): string;
    printReceived(obj: any): string;
  };
}

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

export function toCallApi(this: JestUtils, actual: FetchSpyInstance) {
  assertSpy(actual);
  const calls = actual.getRouteCalls();
  const route = actual.getRoute();
  const pass = calls.length > 0;
  return {
    pass,
    message: () => {
      return [
        this.utils.matcherHint(
          `${this.isNot ? '.not' : ''}.toCallApi`,
          'api',
          ''
        ),
        '',
        'Expected:',
        `  Route "${this.utils.EXPECTED_COLOR(String(route))}" ${
          this.isNot ? 'to never be called' : 'to be called at least once'
        }.`,
        'Received:',
        '  API calls:',
        '',
        ...(!actual.spy.calls.length
          ? ['  No API calls']
          : actual.spy.calls.map((args, i) => {
              return '  ' + i + 1 + ' ' + this.utils.printReceived(args);
            })),
      ].join('\n');
    },
  };
}
export function toCallApiTimes(times: number) {}
export function toCallApiWithHeaders(
  headers: Record<string, string | number | undefined>
) {}
export function toCallApiWithBody(body: any) {}
export function toCallApiWithQuery(query: string | Record<string, any>) {}
