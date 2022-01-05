export function guessContentType(body: unknown) {
  if (typeof body === 'string') {
    try {
      JSON.parse(body);
      return 'application/json';
    } catch {
      return 'text/plain';
    }
  }
  if (body === null || body === undefined) return 'application/json';
  if (typeof FormData !== 'undefined' && body instanceof FormData) {
    return 'multipart/form-data';
  }
  if (typeof ArrayBuffer !== 'undefined' && body instanceof ArrayBuffer) {
    return 'application/octet-stream';
  }
  if (typeof Blob !== 'undefined' && body instanceof Blob) {
    return body.type;
  }
  if (typeof body === 'object') {
    return 'application/json';
  }
  return 'text/plain';
}
