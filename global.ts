interface FetchAssertions<R> {
  toHaveFetched(): R;
  toFetch(): R;

  toHaveFetchedTimes(times: number): R;
  toFetchTimes(times: number): R;

  toHaveFetchedWithHeaders(
    headers: Record<string, string | number | undefined>
  ): R;
  toFetchWithHeaders(headers: Record<string, string | number | undefined>): R;

  toHaveFetchedWithBody(body: any): R;
  toFetchWithBody(body: any): R;

  toHaveFetchedWithQuery(query: string | Record<string, any>): R;
  toFetchWithQuery(query: string | Record<string, any>): R;
}

declare global {
  namespace Chai {
    interface Assertion extends FetchAssertions<void> {}
  }
}

declare namespace jest {
  interface Matchers<R, T> extends FetchAssertions<R> {}
}

export {};
