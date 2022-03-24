# vi-fetch

> Easiest way to mock fetch

Compatible with [Vitest](https://github.com/vitest-dev/vitest) and [Jest](https://github.com/facebook/jest) when using [ESM flag](https://jestjs.io/docs/ecmascript-modules) or with transform for `/node_modules/vi-fetch`.

The main difference with [fetch-mock](https://github.com/wheresrhys/fetch-mock) or [fetch-mock-jest](https://github.com/wheresrhys/fetch-mock-jest) is that they consider `fetch` just as a function call instead of function that calls API _endpoints_. `vi-fetch` provides matchers to test calls to _endpoints_ instead of simply function calls.

For example, we consider an endpoint to be a part of URL until the first `?`: query is an argument to an endpoint, just like `body`, - that's why we provide matchers like `toHaveFetchedWithQuery` and `toHaveFetchedWithBody`.

## Installing

```sh
# with npm
npm install -D vi-fetch

# with pnpm
pnpm install -D vi-fetch

# with yarn
yarn install -D vi-fetch
```

## Usage

### Setup

Before using mock API, you need to set up fetch mock. To do this, import `vi-fetch/setup` in your setup file:

```ts
import 'vi-fetch/setup';
```

If `fetch` is located on another object, you can manually setup it with `prepareFetch` function, imported from `vi-fetch`:

```ts
import { prepareFetch } from 'vi-fetch';

prepareFetch(globalThis, 'fetchNode');
```

Add `vi-fetch/matchers` to your `types` config in `tsconfig.json`, if you are using TypeScript:

```json
{
  "compilerOptions": {
    "types": ["vi-fetch/matchers"]
  }
}
```

Also, it is recommended to clear up all mocks before each test to avoid collision between tests:

```ts
import { mockFetch } from 'vi-fetch';

beforeEach(() => {
  mockFetch.clearAll();
});
```

### Mock Instance

Calling `fetch` in browser can resolve in multiple situations:

- resolve with `ok: true`
- resolve with `ok: false`
- throw `TypeError` if something is wrong

Usually we know the API endpoint and need to test only these three situations, and `vi-fetch` provides a wrapper around `fetch` to make it easy.

Use `mockFetch` function to define `fetch` behavior. Aliases for popular methods are available: `mockGet`, `mockPost`, `mockPut`, `mockPatch`, `mockDelete`.

> You can ignore query string when mocking, if you provide last argument as `false`. By default, query string is necessary, if your fetch call has it.

#### willResolve

To mock `fetch` with `ok: true`, you can use `willResolve/willResolveOnce` methods.

- By default, `willResolve` will resolve to `{}`, if no body is specified.
- By default, `willResolve` will return `status: 200`. You can override it with second argument.

```ts
import { test, expect } from 'vitest';
import { mockGet } from 'vi-fetch';
import { renderApplesTable } from '../src/ApplesTable';

test('apples endpoint was called', async () => {
  // or just "/apples" if you configure baseUrl
  const mock = mockGet('https://api.com/v1/apples').willResolve([
    { count: 33 },
  ]);

  await renderApplesTable();

  expect(mock).toHaveFetched();
});
```

#### willFail

To mock `fetch` with `ok: false`, you can use `willFail/willFailOnce` methods.

- By default, `willFail` will resolve to `{}`, if no body is specified.
- By default, `willFail` will return `status: 500` and `statusText: Internal Server Error`. You can override it with second and third arguments. If you don't specify `status`, it will guess the `statusText` from `status`.

```ts
import { test, expect } from 'vitest';
import { mockGet } from 'vi-fetch';
import { renderApplesTable } from '../src/ApplesTable';

test('apples endpoint was called', async () => {
  // or just "/apples" if you configure baseUrl
  const mock = mockGet('https://api.com/v1/apples').willFail(
    { error: 'no apples' },
    404
  );

  await renderApplesTable();

  expect(mock).toHaveFetched();
});
```

> Warning: calling `willFail` will override every other mock.

#### willThrow

If you have logic that depends on `fetch` throwing, you can test it with `willThrow/willThrowOnce` methods.

`willThrow` requires `Error` object or a message. If `message` is specified, `fetch` will throw `TypeError` with this message.

```ts
import { test, expect } from 'vitest';
import { mockGet } from 'vi-fetch';
import { renderApplesTable } from '../src/ApplesTable';

test('apples endpoint was called', async () => {
  // or just "/apples" if you configure baseUrl
  const mock = mockGet('https://api.com/v1/apples').willThrow('cors error');

  await renderApplesTable();

  expect(mock).toHaveFetched();
});
```

> Warning: calling `willThrow` will override every other mock.

#### willDo

If you want to make custom behaviour when the `fetch` is invoking, you can use `willDo` method. The first argument is `URL` instance, the rest are `fetch` arguments.

```ts
import { test, expect } from 'vitest';
import { mockGet } from 'vi-fetch';
import { renderApplesTable } from '../src/ApplesTable';

test('apples endpoint was called', async () => {
  // or just "/apples" if you configure baseUrl
  const mock = mockGet('https://api.com/v1/apples').willDo((url) => {
    if (url.searchParams.get('offset') > 2)) {
      return { body: [] };
    }
    return { body: [{ count: 3 }] };
  });

  await renderApplesTable();

  expect(mock).toHaveFetched();
});
```

> Warning: calling `willDo` will override every other mock.

#### clear

You can clear all implementation details with `clear` method.

```ts
import { test, expect } from 'vitest';
import { mockGet } from 'vi-fetch';
import { renderApplesTable } from '../src/ApplesTable';

test('apples endpoint was called', async () => {
  // or just "/apples" if you configure baseUrl
  const mock = mockGet('https://api.com/v1/apples').willResolve([
    { count: 33 },
  ]);

  await renderApplesTable();

  expect(mock).toHaveFetched();

  mock.clear();

  expect(mock).not.toHaveFetched();
});
```

#### withHeaders

This method lets you manipulate `Response` headers, if you depend on them. All responses of the mock will return these headers. If you don't specify `Content-Type` header, `mockFetch` tries to guess it from the content you provided as a response.

```ts
import { test, expect } from 'vitest';
import { mockGet } from 'vi-fetch';

test('apples endpoint was called', async () => {
  // or just "/apples" if you configure baseUrl
  const mock = mockGet('https://api.com/v1/apples')
    .withHeaders([['Content-Type', 'text/plain']])
    .willResolve([{ count: 33 }]);

  await renderApplesTable();

  const response = mock.getRouteResults()[0];

  expect(response.headers.get('Content-Type')).toBe('text/plain');
});
```

### Configuration

To not repeat `baseUrl` every time you mock endpoint, you can configure it globally:

```ts
import { mockFetch } from 'vi-fetch';

mockFetch.setOptions({
  baseUrl: 'https://api.com/v1',
});
```

You can also create isolated `mockFetch` with its own options to not collide with globals. It also returns aliased methods.

```ts
import { createMockFetch } from 'vi-fetch';
import { test, expect } from 'vitest';

const { mockFetch } = createMockFetch({ baseUrl: 'https://api.com/v2' });

test('isolated', async () => {
  const mock = mockFetch('GET', '/apples').willResolve(33); // or mockGet

  await fetch('http://api.com/v2/apples');

  expect(mock).toHaveFetched();
});
```

You can ignore `queryString` to make every `fetch` call, that starts with url, to go through this mock by passing `false` as the last argument, and then check it with `toHaveFetchedWithQuery`:

```ts
import { test, expect } from 'vitest';
import { mockGet } from 'vi-fetch';

test('apples endpoint was called', async () => {
  const mock = mockGet('https://api.com/v1/apples', false).willResolve([
    { count: 33 },
  ]);

  await fetch('https://api.com/v1/apples?count=5&offset=2');

  expect(mock).toHaveFetched();
  expect(mock).toHaveFetchedWithQuery({ count: 5, offset: 2 });
});
```

You can also use regular expressions for urls:

```ts
import { test, expect } from 'vitest';
import { mockGet } from 'vi-fetch';

test('apples endpoint was called', async () => {
  const mock = mockGet(/\/apples/).willResolve([{ count: 33 }]);

  await fetch('https://api.com/v1/apples');

  expect(mock).toHaveFetched();
});
```

### Matchers

Imagine we have a test with this setup:

```ts
import { expect, test } from 'vitest';
import { mockFetch } from 'vi-fetch';

mockFetch.setOptions({ baseUrl: 'https://api.com/v1' });

// usually you would call fetch inside your source code
const callFetch = (url, options) => {
  return fetch('https://api.com/v1' + url, options);
};
```

#### toHaveFetched

If you want to check if `fetch` was called with appropriate URL and method at least once, you can use `toHaveFetched`. If you want to be more sure about returned response, you can pass it as optional argument. It will pass if any call returned this response.

```ts
test('api was called', async () => {
  const mock = mockFetch('GET', '/apples').willResolve({
    count: 0,
    apples: [],
  });

  await callFetch('/apples');

  expect(mock).toHaveFetched();
  expect(mock).toHaveFetched({
    count: 0,
    apples: [],
  });
});
```

#### toHaveFetchedNthTime

If you want to check the returned value of nth call, you can use `toHaveFetchedNthTime` (index starts at 1).

```ts
test('api was called', async () => {
  const mock = mockFetch('GET', '/apples').willResolve({
    count: 0,
    apples: [],
  });

  await callFetch('/apples');

  mock.willResolve({
    count: 1,
    apples: ['2kg'],
  });
  await callFetch('/apples');

  expect(mock).toHaveFetchedNthTime(2, {
    count: 1,
    apples: ['2kg'],
  });
});
```

#### toHaveFetchedTimes

If you need to check if URL was called multiple times, you can use `toHaveFetchedTimes`.

```ts
test('api was called 3 times', async () => {
  const mock = mockFetch('GET', '/apples', false).willResolve({
    count: 0,
    apples: [],
  });

  await callFetch('/apples');
  await callFetch('/apples?offset=2');
  await callFetch('/apples?offset=3');

  expect(mock).toHaveFetchedTimes(3);
});
```

#### toHaveFetchedWithBody

If you need to check if URL was called with the specific body, you can use `toHaveFetchedWithBody/toHaveFetchedNthTimeWithBody`.

```ts
test('api was called with json', async () => {
  const mock = mockFetch('POST', '/apples').willResolve({
    count: 0,
    apples: [],
  });

  await callFetch('/apples', {
    method: 'POST',
    body: '{ "foo": "baz" }',
  });

  expect(mock).toHaveFetchedWithBody({ foo: 'baz' });
  expect(mock).toHaveFetchedWithBody('{ "foo": "baz" }');

  expect(mock).toHaveFetchedNthTimeWithBody(1, { foo: 'baz' });
});
```

> Supports string, object, Blob, ArrayBuffer, and FormData. Will try to guess `Content-Type` header if not specified.

#### toHaveFetchedWithQuery

If you need to check if URL was called with the specific query string, you can use `toHaveFetchedWithQuery/toHaveFetchedNthTimeWithQuery`.

Uses [query-string](https://github.com/sindresorhus/query-string) parse function with default options to parse query.

```ts
test('api was called with query', async () => {
  const mock = mockFetch('GET', '/apples').willResolve({
    count: 0,
    apples: [],
  });

  await callFetch('/apples?count=5&offset=2');

  expect(mock).toHaveFetchedWithQuery({ count: 5, offset: 2 });
  expect(mock).toHaveFetchedWithQuery(
    new URLSearchParams({ count: '5', offset: '2' })
  );
  expect(mock).toHaveFetchedWithQuery('count=5&offset=2');

  expect(mock).toHaveFetchedNthTimeWithQuery(1, { count: 5, offset: 2 });
  expect(mock).toHaveFetchedNthTimeWithQuery(1, 'count=5&offset=2');
});
```

> Supports string, object, and URLSearchParams
