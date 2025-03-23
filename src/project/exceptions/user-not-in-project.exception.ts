export class UserNotInProjectException extends Error {
  constructor(userId: number, projectId: number) {
    super(
      `User with id ${userId} is not assigned to project with id ${projectId}`,
    );
  }
}
