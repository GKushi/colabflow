import { EmailSendFailedException } from './exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

jest.mock('nodemailer');

describe('EmailService', () => {
  let service: EmailService;
  let configServiceMock: Partial<ConfigService>;
  const transporterMock = {
    sendMail: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    configServiceMock = {
      get: jest.fn((key: string) => {
        switch (key) {
          case 'MAIL_HOST':
            return 'smtp.example.com';
          case 'MAIL_PORT':
            return 1025;
          case 'MAIL_SECURE':
            return 'false';
          case 'MAIL_USER':
            return 'user';
          case 'MAIL_PASSWORD':
            return 'pass';
          case 'MAIL_SENDER':
            return 'noreply@example.com';
          default:
            return undefined;
        }
      }),
    };

    (nodemailer.createTransport as jest.Mock).mockReturnValue(transporterMock);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: configServiceMock },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should configure transporter with values from ConfigService', () => {
    expect(nodemailer.createTransport).toHaveBeenCalledWith({
      pool: true,
      host: 'smtp.example.com',
      port: 1025,
      secure: false,
      auth: {
        user: 'user',
        pass: 'pass',
      },
    });
  });

  describe('sendMail', () => {
    const email = {
      recipient: 'test@domain.com',
      subject: 'Hello',
      htmlMessage: '<p>Hi!</p>',
    };

    it('resolves when transporter.sendMail calls back without error', async () => {
      transporterMock.sendMail.mockImplementation((opts, callback) =>
        callback(null),
      );

      await expect(service.sendMail(email)).resolves.toBeUndefined();

      expect(transporterMock.sendMail).toHaveBeenCalledWith(
        {
          from: 'noreply@example.com',
          to: 'test@domain.com',
          subject: 'Hello',
          html: '<p>Hi!</p>',
        },
        expect.any(Function),
      );
    });

    it('throws EmailSendFailedException when transporter.sendMail errors', async () => {
      transporterMock.sendMail.mockImplementation((opts, callback) =>
        callback(new Error('SMTP failure')),
      );

      await expect(service.sendMail(email)).rejects.toThrow(
        EmailSendFailedException,
      );
    });
  });
});
