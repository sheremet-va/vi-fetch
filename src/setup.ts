import './extend';
import { prepareFetch } from './api';

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
