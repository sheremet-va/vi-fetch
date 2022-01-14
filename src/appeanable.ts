export class Appeandable {
  protected _s: [any, any][] = [];

  append(name: any, value: any) {
    this._s.push([name, value]);
  }
  delete(name: any) {
    this._s.forEach(([key], index) => {
      if (key === name) {
        this._s.splice(index, 1);
      }
    });
  }
  get(name: any) {
    for (const [key, value] of this._s) {
      if (key === name) {
        return value;
      }
    }
  }
  has(name: any) {
    for (const [key] of this._s) {
      if (key === name) {
        return true;
      }
    }
    return false;
  }
  set(name: any, value: any) {
    this._s = this._s.filter(([key]) => key !== name);
    this._s.push([name, value]);
  }
  forEach(
    callbackfn: (value: any, key: any, parent: any) => void,
    thisArg?: any
  ) {
    this._s.forEach(([key, value]) => {
      callbackfn.call(thisArg ?? this, value, key, this);
    });
  }
  *entries() {
    for (const row of this._s) {
      yield row;
    }
  }
  *keys() {
    for (const [key] of this._s) {
      yield key;
    }
  }
  *values() {
    for (const [, value] of this._s) {
      yield value;
    }
  }
  *[Symbol.iterator]() {
    for (const row of this._s) {
      yield row;
    }
  }
}
