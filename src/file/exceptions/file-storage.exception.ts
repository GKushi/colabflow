export class FileStorageException extends Error {
  constructor(operation: string) {
    super(`File storage error during ${operation}`);
  }
}
