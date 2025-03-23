export class PasswordUnchangedException extends Error {
  constructor() {
    super('New password cannot be the same as old password');
  }
}
