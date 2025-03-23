export class UserAlreadyVerifiedException extends Error {
  constructor(userId: number) {
    super(`User with id ${userId} is already verified`);
  }
}
