import { Appeandable } from './appeanable.js';

export class FormDataMock extends Appeandable implements FormData {
  constructor(form?: HTMLFormElement) {
    super();

    form?.querySelectorAll('[name]').forEach((node) => {
      const name = node.getAttribute('name');
      const value = node.getAttribute('value');

      this.append(name, value);
    });
  }

  getAll(name: string) {
    const results: FormDataEntryValue[] = [];
    for (const [key, value] of this._s) {
      if (key === name) {
        results.push(value);
      }
    }
    return results;
  }
}
