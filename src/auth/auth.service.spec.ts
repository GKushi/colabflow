jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(async (password, _) => password),
}));
import { InvalidCredentialsException } from './exceptions/invalid-credentials.exception';
import { ResourceNotFoundException } from '../common/exceptions';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerificationService } from './verification.service';
import { UserAlreadyVerifiedException } from './exceptions';
import { PasswordUnchangedException } from './exceptions';
import { Test, TestingModule } from '@nestjs/testing';
import { RegisterDto, ResetPasswordDto } from './dto';
import { UserService } from '../user/user.service';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto';
import { Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

const registerDto: RegisterDto = {
  password: 'testPassword',
  nickName: 'testUser',
  email: 'test@email.com',
  firstName: 'Test',
  lastName: 'User',
};

describe('AuthService', () => {
  let authService: AuthService;
  let userService: UserService;
  let verificationService: VerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: {
            createUser: jest.fn(),
            findUserByEmail: jest.fn(),
            findUserById: jest.fn(),
            activateUser: jest.fn(),
            updateUser: jest.fn(),
          },
        },
        {
          provide: VerificationService,
          useValue: {
            createAndSendEmailVerificationToken: jest.fn(),
            createAndSendPasswordResetToken: jest.fn(),
            verifyToken: jest.fn(),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    userService = module.get<UserService>(UserService);
    verificationService = module.get<VerificationService>(VerificationService);
  });

  describe('register', () => {
    describe('when data is valid', () => {
      it('should call create user with correct data', async () => {
        const createUserSpy = jest
          .spyOn(userService, 'createUser')
          .mockResolvedValue(registerDto as any);

        await authService.register(registerDto);

        const { password, ...userData } = registerDto;

        expect(createUserSpy).toHaveBeenCalledWith({
          ...userData,
          passwordHash: registerDto.password,
        });
      });

      it('should return created user', async () => {
        jest
          .spyOn(userService, 'createUser')
          .mockResolvedValue(registerDto as any);

        const result = await authService.register(registerDto);

        expect(result).toEqual(registerDto);
      });

      it('should create password hash with correct data', async () => {
        jest
          .spyOn(userService, 'createUser')
          .mockResolvedValue(registerDto as any);

        const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

        await authService.register(registerDto);

        expect(bcryptHashSpy).toHaveBeenCalledWith(registerDto.password, 10);
      });

      it('should send email with verification token', async () => {
        const createAndSendEmailVerificationTokenSpy = jest.spyOn(
          verificationService,
          'createAndSendEmailVerificationToken',
        );
        const createdUser = { ...registerDto, id: 1 } as any;

        jest
          .spyOn(userService, 'createUser')
          .mockResolvedValue(createdUser as any);

        await authService.register(registerDto);

        expect(createAndSendEmailVerificationTokenSpy).toHaveBeenCalledWith(
          createdUser.id,
          createdUser.email,
        );
      });
    });

    describe('when send verification email failed', () => {
      beforeEach(() => {
        jest
          .spyOn(verificationService, 'createAndSendEmailVerificationToken')
          .mockRejectedValue(new Error('Email send failed'));
      });

      it('should log an error', async () => {
        const errorLog = jest
          .spyOn(Logger.prototype, 'error')
          .mockImplementation(jest.fn());

        const createdUser = { ...registerDto, id: 1 } as any;

        jest
          .spyOn(userService, 'createUser')
          .mockResolvedValue(createdUser as any);

        await authService.register(registerDto);

        expect(errorLog).toHaveBeenCalledWith(
          `Failed to send verification token while registering user: ${createdUser.id}`,
        );
      });

      it('should return created user', async () => {
        jest
          .spyOn(userService, 'createUser')
          .mockResolvedValue(registerDto as any);

        const result = await authService.register(registerDto);

        expect(result).toEqual(registerDto);
      });
    });

    describe('login', () => {
      let loginDto: LoginDto;

      beforeEach(() => {
        loginDto = {
          email: registerDto.email,
          password: registerDto.password,
        };
      });

      it('should return the user when credentials are valid', async () => {
        const foundUser = {
          id: 123,
          email: loginDto.email,
          passwordHash: 'storedHash',
        } as any;

        jest.spyOn(userService, 'findUserByEmail').mockResolvedValue(foundUser);

        (bcrypt.compare as jest.Mock).mockResolvedValue(true);

        const result = await authService.login(loginDto);

        expect(result).toBe(foundUser);
        expect(bcrypt.compare).toHaveBeenCalledWith(
          loginDto.password,
          foundUser.passwordHash,
        );
      });

      it('should throw InvalidCredentialsException if user not found', async () => {
        jest.spyOn(userService, 'findUserByEmail').mockResolvedValue(null);

        await expect(authService.login(loginDto)).rejects.toThrow(
          InvalidCredentialsException,
        );
      });

      it('should throw InvalidCredentialsException if password does not match', async () => {
        const foundUser = {
          id: 456,
          email: loginDto.email,
          passwordHash: 'wrongHash',
        } as any;

        jest.spyOn(userService, 'findUserByEmail').mockResolvedValue(foundUser);

        (bcrypt.compare as jest.Mock).mockResolvedValue(false);

        await expect(authService.login(loginDto)).rejects.toThrow(
          InvalidCredentialsException,
        );
      });
    });
  });

  describe('sendVerificationToken', () => {
    const userId = 123;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should log and call createAndSendEmailVerificationToken when user exists and is not verified', async () => {
      const user = {
        id: userId,
        email: 'foo@bar.com',
        emailVerified: false,
      } as any;

      jest.spyOn(userService, 'findUserById').mockResolvedValue(user);

      const sendTokenSpy = jest
        .spyOn(verificationService, 'createAndSendEmailVerificationToken')
        .mockResolvedValue(undefined);

      const logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => {});

      await authService.sendVerificationToken(userId);

      expect(logSpy).toHaveBeenCalledWith(
        `Sending verification token to user: ${userId}`,
      );
      expect(sendTokenSpy).toHaveBeenCalledWith(userId, user.email);
    });

    it('should throw ResourceNotFoundException if no user is found', async () => {
      jest.spyOn(userService, 'findUserById').mockResolvedValue(null);

      await expect(authService.sendVerificationToken(userId)).rejects.toThrow(
        ResourceNotFoundException,
      );
    });

    it('should throw UserAlreadyVerifiedException if user.emailVerified is true', async () => {
      const user = {
        id: userId,
        email: 'foo@bar.com',
        emailVerified: true,
      } as any;

      jest.spyOn(userService, 'findUserById').mockResolvedValue(user);

      await expect(authService.sendVerificationToken(userId)).rejects.toThrow(
        UserAlreadyVerifiedException,
      );
    });
  });

  describe('forgotPassword', () => {
    const forgotPasswordDto: ForgotPasswordDto = {
      email: 'reset@me.com',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should log and call createAndSendPasswordResetToken when user exists', async () => {
      const fakeUser = {
        id: 777,
        email: forgotPasswordDto.email,
        passwordHash: 'irrelevant',
      } as any;

      jest.spyOn(userService, 'findUserByEmail').mockResolvedValue(fakeUser);

      const resetTokenSpy = jest
        .spyOn(verificationService, 'createAndSendPasswordResetToken')
        .mockResolvedValue(undefined);

      const logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => {});

      await authService.forgotPassword(forgotPasswordDto);

      expect(logSpy).toHaveBeenCalledWith(
        `Sending password reset token to: ${forgotPasswordDto.email}`,
      );
      expect(resetTokenSpy).toHaveBeenCalledWith(fakeUser.id, fakeUser.email);
    });

    it('should throw ResourceNotFoundException if no user is found', async () => {
      jest.spyOn(userService, 'findUserByEmail').mockResolvedValue(null);

      await expect(
        authService.forgotPassword(forgotPasswordDto),
      ).rejects.toThrow(ResourceNotFoundException);
    });
  });

  describe('verify', () => {
    const token = 'testToken';
    const userId = 99;

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should call verifyToken and then activateUser with the returned userId', async () => {
      jest.spyOn(verificationService, 'verifyToken').mockResolvedValue(userId);

      const activateSpy = jest
        .spyOn(userService, 'activateUser')
        .mockResolvedValue(undefined as any);

      await authService.verify(token);

      expect(verificationService.verifyToken).toHaveBeenCalledWith(token);
      expect(activateSpy).toHaveBeenCalledWith(userId);
    });

    it('should throw if verificationService.verifyToken rejects', async () => {
      jest
        .spyOn(verificationService, 'verifyToken')
        .mockRejectedValue(new Error('Invalid token'));

      await expect(authService.verify(token)).rejects.toThrow('Invalid token');
    });
  });

  describe('resetPassword', () => {
    const token = 'reset-token';
    const resetPasswordDto: ResetPasswordDto = {
      password: 'newSecret',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should log, hash the new password, and call updateUser with the hashed password', async () => {
      const userId = 55;

      jest.spyOn(verificationService, 'verifyToken').mockResolvedValue(userId);

      const bcryptHashSpy = jest.spyOn(bcrypt, 'hash');

      const updateSpy = jest
        .spyOn(userService, 'updateUser')
        .mockResolvedValue(undefined as any);

      const logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => {});

      await authService.resetPassword(token, resetPasswordDto);

      expect(logSpy).toHaveBeenCalledWith(
        `Resetting password for user with token: ${token}`,
      );
      expect(bcryptHashSpy).toHaveBeenCalledWith(resetPasswordDto.password, 10);
      expect(updateSpy).toHaveBeenCalledWith(userId, {
        passwordHash: resetPasswordDto.password,
      });
    });

    it('should throw if verificationService.verifyToken rejects', async () => {
      jest
        .spyOn(verificationService, 'verifyToken')
        .mockRejectedValue(new Error('Invalid token'));

      await expect(
        authService.resetPassword(token, resetPasswordDto),
      ).rejects.toThrow('Invalid token');
    });
  });

  describe('changePassword', () => {
    const userId = 123;
    const changePasswordDto: ChangePasswordDto = {
      oldPassword: 'oldSecret',
      newPassword: 'newSecret',
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should log, check old password, hash new, and updateUser when everything is valid', async () => {
      const fakeUser = { id: userId, passwordHash: 'oldSecret' } as any;
      jest.spyOn(userService, 'findUserById').mockResolvedValue(fakeUser);

      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const hashSpy = jest.spyOn(bcrypt, 'hash');
      const updateSpy = jest
        .spyOn(userService, 'updateUser')
        .mockResolvedValue(undefined as any);

      const logSpy = jest
        .spyOn(Logger.prototype, 'log')
        .mockImplementation(() => {});

      await authService.changePassword(changePasswordDto, userId);

      expect(logSpy).toHaveBeenCalledWith(
        `Changing password for user: ${userId}`,
      );
      expect(bcrypt.compare).toHaveBeenCalledWith(
        changePasswordDto.oldPassword,
        fakeUser.passwordHash,
      );
      expect(hashSpy).toHaveBeenCalledWith(changePasswordDto.newPassword, 10);
      expect(updateSpy).toHaveBeenCalledWith(userId, {
        passwordHash: changePasswordDto.newPassword,
      });
    });

    it('should throw PasswordUnchangedException if newPassword === oldPassword', async () => {
      const dto = {
        oldPassword: 'samePass',
        newPassword: 'samePass',
      } as ChangePasswordDto;

      await expect(authService.changePassword(dto, userId)).rejects.toThrow(
        PasswordUnchangedException,
      );
    });

    it('should throw ResourceNotFoundException if userService.findUserById returns null', async () => {
      jest.spyOn(userService, 'findUserById').mockResolvedValue(null);

      await expect(
        authService.changePassword(changePasswordDto, userId),
      ).rejects.toThrow(ResourceNotFoundException);
    });

    it('should throw InvalidCredentialsException if old password does not match', async () => {
      jest
        .spyOn(userService, 'findUserById')
        .mockResolvedValue({ id: userId, passwordHash: 'hash' } as any);

      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        authService.changePassword(changePasswordDto, userId),
      ).rejects.toThrow(InvalidCredentialsException);
    });
  });
});
