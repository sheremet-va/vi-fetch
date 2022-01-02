// @ts-nocheck

import {
  toCallApi,
  toCallApiTimes,
  toCallApiWithBody,
  toCallApiWithHeaders,
  toCallApiWithQuery,
} from './matchers';

export function declareFetchAssertions(vi: { extend: any }) {
  vi.extend({
    toCallApi,
    toCallApiTimes,
    toCallApiWithBody,
    toCallApiWithHeaders,
    toCallApiWithQuery,
  });
}

if (typeof vi !== 'undefined') {
  declareFetchAssertions(vi);
} else if (typeof jest !== 'undefined') {
  declareFetchAssertions(jest);
}
