import { HeadersMock } from './headers.js';

export class ResponseMock implements Response {
  public body = null;
  public bodyUsed = false;

  constructor(
    private path: string,
    public value: unknown,
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
    return new HeadersMock(this.init.headers);
  }

  get ok() {
    return this.status >= 200 && this.status < 300;
  }

  get redirected() {
    return this.status >= 300 && this.status < 400;
  }

  get status() {
    return this.init.status || 500;
  }

  get statusText() {
    return this.init.statusText || 'Internal Server Error';
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
