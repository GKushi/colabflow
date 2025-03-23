import { EmailSendFailedException } from './exceptions';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';
import type { Email } from './interfaces';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      pool: true,
      host: this.configService.get('MAIL_HOST'),
      port: this.configService.get('MAIL_PORT'),
      secure: this.configService.get('MAIL_SECURE') !== 'false',
      auth: {
        user: this.configService.get('MAIL_USER'),
        pass: this.configService.get('MAIL_PASSWORD'),
      },
    });
  }

  async sendMail(email: Email) {
    return new Promise<void>((res) => {
      this.transporter.sendMail(
        {
          from: this.configService.get('MAIL_SENDER'),
          to: email.recipient,
          subject: email.subject,
          html: email.htmlMessage,
        },
        (err) => {
          if (err) throw new EmailSendFailedException(email.recipient);
          res();
        },
      );
    });
  }
}
