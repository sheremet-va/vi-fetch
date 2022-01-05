// @ts-nocheck

import {
  toFetch,
  toFetchTimes,
  toFetchWithBody,
  // toFetchWithHeaders,
  toFetchWithQuery,
} from './matchers';

export function declareFetchAssertions(expect: { extend: any }) {
  expect.extend({
    toHaveFetched: toFetch,
    toFetch,

    toHaveFetchedTimes: toFetchTimes,
    toFetchTimes,

    toHaveFetchedWithBody: toFetchWithBody,
    toFetchWithBody,

    // toHaveFetchedWithHeaders: toFetchWithHeaders,
    // toFetchWithHeaders,

    toHaveFetchedWithQuery: toFetchWithQuery,
    toFetchWithQuery,
  });
}

if (typeof expect !== 'undefined') {
  declareFetchAssertions(expect);
}
