# vi-fetch

> An easy way to mock fetch

Compatible with Jest and Vitest.

> WIP: currently does not work

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

### Mock API

<!---TODO--->

```ts
import { mockApi } from 'vi-fetch';

const mock = mockApi('GET', '/apples').willResolve(33);

expect(mock).toCallApi();
```

Aliases for popular methods are available: `mockGet`, `mockPost`, `mockPut`, `mockPatch`, `mockDelete`.

You can define `baseUrl` globally:

```ts
import { mockApi } from 'vi-fetch';

mockApi.setOptions({
  baseUrl: 'https://api.com/v1',
});
```

You can create isolated `mockApi`:

```ts
import { createMockApi } from 'vi-fetch';

const { mockApi } = createMockApi({ baseUrl: 'http://api.com/v2' });

const mock = mockApi('GET', '/apples').willResolve(33);

expect(mock).toCallApi();
```
