export class PermissionDeniedException extends Error {
  constructor(message?: string) {
    super(message || 'You are not allowed to perform this action');
  }
}
