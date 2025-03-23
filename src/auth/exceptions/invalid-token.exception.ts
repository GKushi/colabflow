export class InvalidTokenException extends Error {
  constructor() {
    super(`Invalid token`);
  }
}
