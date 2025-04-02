export class InvalidRegisterCredentialsException extends Error {
  constructor() {
    super('Invalid register credentials');
  }
}
