interface FetchAssertions<R> {
  toHaveFetched<T>(data?: T): R;
  toFetch<T>(data?: T): R;

  toHaveFetchedNthTime<T>(times: number, data: T): R;
  toFetchNthTime<T>(times: number, data: T): R;

  toHaveFetchedTimes(times: number): R;
  toFetchTimes(times: number): R;

  toHaveFetchedWithBody(body: any): R;
  toFetchWithBody(body: any): R;
  toHaveFetchedNthTimeWithBody(time: number, body: any): R;
  toFetchNthTimeWithBody(time: number, body: any): R;

  toHaveFetchedWithQuery(
    query: string | Record<string, any> | URLSearchParams
  ): R;
  toFetchWithQuery(query: string | Record<string, any> | URLSearchParams): R;
  toHaveFetchedNthTimeWithQuery(
    time: number,
    query: string | Record<string, any> | URLSearchParams
  ): R;
  toFetchNthTimeWithQuery(
    time: number,
    query: string | Record<string, any> | URLSearchParams
  ): R;
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
