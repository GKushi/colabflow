export class InvalidConfigurationException extends Error {
  constructor(message?: string) {
    super(message || 'Invalid application configuration');
  }
}
