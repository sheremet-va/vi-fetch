import { Appeandable } from './appeanable.js';

function normalizeName(name: string) {
  if (typeof name !== 'string') {
    name = String(name);
  }
  if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === '') {
    throw new TypeError(
      'Invalid character in header field name: "' + name + '"'
    );
  }
  return name.toLowerCase();
}

export class HeadersMock extends Appeandable implements Headers {
  constructor(init?: HeadersInit | Record<string, string | number | boolean>) {
    super();

    if (!init) return;

    if (Array.isArray(init)) {
      init.forEach(([key, name]) =>
        this.append(normalizeName(key), String(name))
      );
      return;
    }

    if (
      init instanceof HeadersMock ||
      (typeof Headers !== 'undefined' && init instanceof Headers)
    ) {
      init.forEach((value, key) =>
        this.append(normalizeName(key), String(value))
      );
      return;
    }

    for (const key in init) {
      this.append(
        normalizeName(key),
        String((init as Record<string, string>)[key])
      );
    }
  }

  append(name: string, value: string) {
    super.append(normalizeName(name), String(value));
  }
  delete(name: string) {
    super.delete(normalizeName(name));
  }
  get(name: string) {
    return super.get(normalizeName(name)) ?? null;
  }
  has(name: string) {
    return super.has(normalizeName(name));
  }
  set(name: string, value: string) {
    super.set(normalizeName(name), String(value));
  }
}
