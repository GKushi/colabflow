import { InvalidRegisterCredentialsException } from './exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, User } from '@prisma/client';
import { CreateUserData } from './interfaces';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;

  // Explicit mock of PrismaService.user delegate
  const userMock = {
    create: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
  };
  const prismaMock: Partial<PrismaService> = {
    user: userMock as any,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
  });

  describe('createUser', () => {
    const dto: CreateUserData = {
      email: 'test@email.com',
      firstName: 'Aaa',
      lastName: 'Bbbb',
      nickName: 'AaaBbb',
      passwordHash: 'passwordHash',
    };

    it('should call prisma.user.create with correct data and return user', async () => {
      const createdUser: User = {
        id: 1,
        ...dto,
        role: 'TEAM_MEMBER',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      userMock.create.mockResolvedValue(createdUser);

      const result = await service.createUser(dto);
      expect(userMock.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual(createdUser);
    });

    it('should throw InvalidRegisterCredentialsException on P2002 error', async () => {
      const err: any = new Error('Unique constraint');
      err.code = 'P2002';
      Object.setPrototypeOf(
        err,
        (Prisma.PrismaClientKnownRequestError as any).prototype,
      );

      userMock.create.mockRejectedValue(err);

      await expect(service.createUser(dto)).rejects.toThrow(
        InvalidRegisterCredentialsException,
      );
    });

    it('should rethrow non–P2002 errors', async () => {
      const err = new Error('Something else');
      userMock.create.mockRejectedValue(err);

      await expect(service.createUser(dto)).rejects.toThrow(err);
    });
  });

  describe('findUserByEmail', () => {
    it('should call prisma.user.findUnique with correct where clause', async () => {
      const email = 'test@example.com';
      const found = { id: 2, email } as User;
      userMock.findUnique.mockResolvedValue(found);

      const result = await service.findUserByEmail(email);
      expect(userMock.findUnique).toHaveBeenCalledWith({ where: { email } });
      expect(result).toEqual(found);
    });

    it('should return null if user not found', async () => {
      userMock.findUnique.mockResolvedValue(null);
      await expect(service.findUserByEmail('x@y.com')).resolves.toBeNull();
    });
  });

  describe('findUserById', () => {
    it('should call prisma.user.findUnique with correct where clause', async () => {
      const id = 5;
      const found = { id, email: 'u@u.com' } as User;
      userMock.findUnique.mockResolvedValue(found);

      const result = await service.findUserById(id);
      expect(userMock.findUnique).toHaveBeenCalledWith({ where: { id } });
      expect(result).toEqual(found);
    });

    it('should return null if user not found', async () => {
      userMock.findUnique.mockResolvedValue(null);
      await expect(service.findUserById(123)).resolves.toBeNull();
    });
  });

  describe('activateUser', () => {
    it('should call prisma.user.update to set emailVerified=true', async () => {
      const id = 7;
      const updated = { id, emailVerified: true } as User;
      userMock.update.mockResolvedValue(updated);

      const result = await service.activateUser(id);
      expect(userMock.update).toHaveBeenCalledWith({
        where: { id },
        data: { emailVerified: true },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('updateUser', () => {
    it('should call prisma.user.update with partial data', async () => {
      const id = 9;
      const data: Partial<User> = { firstName: 'Alice' };
      const updated = { id, ...data } as User;
      userMock.update.mockResolvedValue(updated);

      const result = await service.updateUser(id, data);
      expect(userMock.update).toHaveBeenCalledWith({
        where: { id },
        data,
      });
      expect(result).toEqual(updated);
    });
  });
});
