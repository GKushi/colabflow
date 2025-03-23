export class UserNotVerifiedException extends Error {
  constructor(id: number) {
    super(`User with id ${id} is not verified`);
  }
}
