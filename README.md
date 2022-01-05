# vi-fetch

> Easiest way to mock fetch

Compatible with [Vitest](https://github.com/vitest-dev/vitest) and [Jest](https://github.com/facebook/jest) when using [ESM flag](https://jestjs.io/docs/ecmascript-modules) or with transform for `/node_modules/vi-fetch`.

The main difference with [fetch-mock](https://github.com/wheresrhys/fetch-mock) or [fetch-mock-jest](https://github.com/wheresrhys/fetch-mock-jest) is that they consider `fetch` just as a function call instead of calls to _endpoints_. `vi-fetch` provides matchers to test calls to _endpoints_ instead of simply function calls. For example, we consider an endpoint to be URL until the first `?`, query is like arguments to an endpoint, just like `body` - that's why we provide matchers like `toHaveFetchedWithQuery`.

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

### Mock Instance

Calling `fetch` in browser can resolve in multiple situations:

- resolve with `ok: true`
- resolve with `ok: false`
- throw `TypeError` if something is wrong

Usually we know the API endpoint and need to test only these three situations, and `vi-fetch` provides a wrapper around `fetch` to make it easy.

Use `mockApi` function to define `fetch` behavior. Aliases for popular methods are available: `mockGet`, `mockPost`, `mockPut`, `mockPatch`, `mockDelete`.

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
- By default, `willFail` will return `status: 500` and `statucCode: Internal error`. You can override it with second and third arguments.

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

`willThrow` requires `Error` object or a message. If `message` is specified, `fetch` will throw `TypeError`.

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

If you want to do something when the `fetch` is invoking, you can use `willDo` method:

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

You can clear on implementation details with `clear` method.

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

### Configuration

To not repeat `baseUrl` every time you mock endpoint, you can configure it globally:

```ts
import { mockApi } from 'vi-fetch';

mockApi.setOptions({
  baseUrl: 'https://api.com/v1',
});
```

You can also create isolated `mockApi` with its own options to not collide with globals:

```ts
import { createMockApi } from 'vi-fetch';
import { test, expect } from 'vitest';

const { mockApi } = createMockApi({ baseUrl: 'https://api.com/v2' });

test('isolated', async () => {
  const mock = mockApi('GET', '/apples').willResolve(33);

  await fetch('http://api.com/v2/apples');

  expect(mock).toHaveFetched();
});
```

You can ignore `queryString`, if it doesn't matter for you and then check it with `toHaveFetchedWithQuery`, if it's needed:

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

### Matchers

Imagine we have a test with this setup:

```ts
import { expect, test } from 'vitest';
import { mockApi } from 'vi-fetch';

mockApi.setOptions({ baseUrl: 'https://api.com/v1' });

// usually you would call fetch inside your source code
const callFetch = (url, options) => {
  return fetch('https://api.com/v1' + url, options);
};
```

#### toHaveFetched

If you want to check if `fetch` was called with appropriate URL and method at least once, you can use `toHaveFetched`.

```ts
test('api was called', async () => {
  const mock = mockApi('GET', '/apples').willResolve({
    count: 0,
    apples: [],
  });

  await callFetch('/apples');

  expect(mock).toHaveFetched();
});
```

#### toHaveFetchedTimes

If you need to check if URL was called multiple times, you can use `toHaveFetchedTimes`.

```ts
test('api was called 3 times', async () => {
  const mock = mockApi('GET', '/apples', false).willResolve({
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
  const mock = mockApi('POST', '/apples').willResolve({
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

#### toHaveFetchedWithQuery

If you need to check if URL was called with the specific query string, you can use `toHaveFetchedWithQuery/toHaveFetchedNthTimeWithQuery`.

```ts
test('api was called with json', async () => {
  const mock = mockApi('GET', '/apples').willResolve({
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

> Support string, object or URLSearchParams
