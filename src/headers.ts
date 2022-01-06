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

export class HeadersMock implements Headers {
  private headers = new Map<string, string>();

  constructor(init?: HeadersInit | Record<string, string | number | boolean>) {
    if (!init) return;

    if (Array.isArray(init)) {
      init.forEach(([key, name]) =>
        this.headers.set(normalizeName(key), String(name))
      );
      return;
    }

    if (
      init instanceof HeadersMock ||
      (typeof Headers !== 'undefined' && init instanceof Headers)
    ) {
      init.forEach((value, key) =>
        this.headers.set(normalizeName(key), String(value))
      );
      return;
    }

    for (const key in init) {
      this.headers.set(
        normalizeName(key),
        String((init as Record<string, string>)[key])
      );
    }
  }

  append(name: string, value: string) {
    this.headers.set(normalizeName(name), String(value));
  }
  delete(name: string) {
    this.headers.delete(normalizeName(name));
  }
  get(name: string) {
    return this.headers.get(normalizeName(name)) ?? null;
  }
  has(name: string) {
    return this.headers.has(normalizeName(name));
  }
  set(name: string, value: string) {
    this.headers.set(normalizeName(name), String(value));
  }
  forEach(
    callbackfn: (value: string, key: string, parent: Headers) => void,
    thisArg?: any
  ) {
    this.headers.forEach((value, key) =>
      callbackfn.call(thisArg ?? this, value, key, this)
    );
  }
  entries() {
    return this.headers.entries();
  }
  keys() {
    return this.headers.keys();
  }
  values() {
    return this.headers.values();
  }
  [Symbol.iterator]() {
    return this.headers[Symbol.iterator]();
  }
}
