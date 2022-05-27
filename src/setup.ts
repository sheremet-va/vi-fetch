import './extend.js';
import { prepareFetch } from './api.js';
import { HeadersMock } from './headers.js';
import { FormDataMock } from './formdata.js';

prepareFetch();

if (!('Headers' in globalThis)) {
  globalThis.Headers = HeadersMock;
}

if (!('FormData' in globalThis)) {
  globalThis.FormData = FormDataMock;
}
