export class FileLimitExceededException extends Error {
  constructor(resource: string, resourceId: number) {
    super(`File limit exceeded on ${resource} with id ${resourceId}`);
  }
}
