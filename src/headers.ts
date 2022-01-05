export class HeadersMock implements Headers {
  private headers = new Map<string, string>();

  constructor(init?: HeadersInit | Record<string, string | number | boolean>) {
    if (!init) return;

    if (Array.isArray(init)) {
      init.forEach(([key, name]) => this.headers.set(key, name));
      return;
    }

    if (
      init instanceof HeadersMock ||
      (typeof Headers !== 'undefined' && init instanceof Headers)
    ) {
      init.forEach((key, name) => this.headers.set(key, name));
      return;
    }

    for (const key in init) {
      this.headers.set(key, String((init as Record<string, string>)[key]));
    }
  }

  append(name: string, value: string) {
    this.headers.set(name, value);
  }
  delete(name: string) {
    this.headers.delete(name);
  }
  get(name: string) {
    return this.headers.get(name) ?? null;
  }
  has(name: string) {
    return this.headers.has(name);
  }
  set(name: string, value: string) {
    this.headers.set(name, value);
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
