# vi-fetch

> An easy way to mock fetch

Compatible with Jest and Vitest.

## Installing

```sh
# with npm
npm install -D fetch-mock

# with pnpm
pnpm install -D fetch-mock

# with yarn
yarn install -D fetch-mock
```

## Usage

### Setup

Before using mock API, you need to set up fetch mock. To do this, import `fetch-mock/setup` in your setup file:

```ts
import 'fetch-mock/setup';
```

If `fetch` is located on another object, you can manually setup it with `prepareFetch` function, imported from `fetch-mock`:

```ts
import { prepareFetch } from 'fetch-mock';

prepareFetch(globalThis, 'fetchNode');
```

### Mock API

<!---TODO--->

```ts
import { mockApi } from 'fetch-mock';

const mock = mockApi('GET', '/apples').willResolve(33);

expect(mock).toCallApi();
```

Aliases for popular methods are available: `mockGet`, `mockPost`, `mockPut`, `mockPatch`, `mockDelete`.

You can define `baseUrl` globally:

```ts
import { mockApi } from 'fetch-mock';

mockApi.setOptions({
  baseUrl: 'https://api.com/v1',
});
```

You can create isolated `mockApi`:

```ts
import { createMockApi } from 'fetch-mock';

const { mockApi } = createMockApi({ baseUrl: 'http://api.com/v2' });

const mock = mockApi('GET', '/apples').willResolve(33);

expect(mock).toCallApi();
```
