import {
  toFetch,
  toFetchNthTime,
  toFetchTimes,
  toFetchWithBody,
  toFetchWithQuery,
  toFetchNthTimeWithBody,
  toFetchNthTimeWithQuery,
} from './matchers.js';

export function declareFetchAssertions(expect: { extend: (obj: any) => any }) {
  expect.extend({
    toHaveFetched: toFetch,
    toFetch,

    toHaveFetchedNthTime: toFetchNthTime,
    toFetchNthTime,

    toHaveFetchedTimes: toFetchTimes,
    toFetchTimes,

    toHaveFetchedWithBody: toFetchWithBody,
    toFetchWithBody,
    toHaveFetchedNthTimeWithBody: toFetchNthTimeWithBody,
    toFetchNthTimeWithBody,

    toHaveFetchedWithQuery: toFetchWithQuery,
    toFetchWithQuery,
    toHaveFetchedNthTimeWithQuery: toFetchNthTimeWithQuery,
    toFetchNthTimeWithQuery,
  });
}

if (typeof expect !== 'undefined') {
  declareFetchAssertions(expect);
}
