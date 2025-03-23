export class EmailSendFailedException extends Error {
  constructor(recipient: string) {
    super(`Failed to send email to ${recipient}`);
  }
}
