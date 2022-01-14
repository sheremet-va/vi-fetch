import './extend.js';
import { prepareFetch } from './api.js';
import { HeadersMock } from './headers.js';
import { FormDataMock } from './formdata.js';

// if happy dom
if (
  globalThis &&
  globalThis.window &&
  'fetch' in globalThis.window &&
  globalThis.window.fetch
) {
  prepareFetch(globalThis.window);
} else {
  prepareFetch();
}

if (!('Headers' in global)) {
  global.Headers = HeadersMock;
  global.window.Headers = HeadersMock;
}

if (!('FormData' in global)) {
  global.FormData = FormDataMock;
  global.window.FormData = FormDataMock;
}
