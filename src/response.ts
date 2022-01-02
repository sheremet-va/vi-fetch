export class ResponseMock {
  public body = null;
  public bodyUsed = false;

  constructor(
    private path: string,
    private value: unknown,
    private init: ResponseInit
  ) {}

  private assertBodyUsed() {
    if (this.bodyUsed) {
      throw new TypeError('body is already in use');
    }
    this.bodyUsed = true;
  }

  async json() {
    this.assertBodyUsed();
    if (typeof this.value === 'string') {
      return JSON.parse(this.value);
    }
    return this.value;
  }

  async text() {
    this.assertBodyUsed();
    if (typeof this.value === 'object') {
      return JSON.stringify(this.value);
    }
    return String(this.value);
  }

  async formData() {
    this.assertBodyUsed();
    if (this.value instanceof FormData) {
      return this.value;
    }
    throw new TypeError('mocked value is not instance of FormData');
  }

  async blob() {
    this.assertBodyUsed();
    if (this.value instanceof Blob) {
      return this.value;
    }
    throw new TypeError('mocked value is not instance of Blob');
  }

  async arrayBuffer() {
    this.assertBodyUsed();
    if (this.value instanceof ArrayBuffer) {
      return this.value;
    }
    throw new TypeError('mocked value is not instance of ArrayBuffer');
  }

  get headers() {
    return this.init.headers as Headers; // TODO
  }

  get ok() {
    return this.status >= 200 && this.status < 400;
  }

  get redirected() {
    return false;
  }

  get status() {
    return this.init.status || 500;
  }

  get statusText() {
    return this.init.statusText || 'Ok';
  }

  get type() {
    return 'default' as const;
  }

  get url() {
    return this.path;
  }

  clone() {
    return new ResponseMock(this.path, this.value, this.init);
  }
}
