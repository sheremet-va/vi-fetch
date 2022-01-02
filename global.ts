interface FetchAssertions<R> {
  toCallApi(): R;
  toCallApiTimes(times: number): R;
  toCallApiWithHeaders(headers: Record<string, string | number | undefined>): R;
  toCallApiWithBody(body: any): R;
  toCallApiWithQuery(query: string | Record<string, any>): R;
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
