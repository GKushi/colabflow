export class ResourceNotFoundException extends Error {
  constructor(resource: string, id?: number) {
    super(`${resource} ${id ? `with id ${id} ` : ''}not found`);
  }
}
