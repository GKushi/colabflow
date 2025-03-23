export class UserAlreadyInProjectException extends Error {
  constructor(userId: number, projectId: number) {
    super(
      `User with id ${userId} is already assigned to project with id ${projectId}`,
    );
  }
}
