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
  if (body instanceof Blob) {
    return body.type;
  }
  if (typeof body === 'object') {
    return 'application/json';
  }
  return 'text/plain';
}
