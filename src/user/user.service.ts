import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, User } from '@prisma/client';
import { CreateUserData } from './interfaces';

@Injectable()
export class UserService {
  constructor(@Inject(PrismaService) private prismaService: PrismaService) {}
  async createUser(user: CreateUserData) {
    try {
      return await this.prismaService.user.create({ data: user });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError) {
        if (e.code === 'P2002')
          throw new ConflictException(
            'User with this credentials already exists',
          );
      }
      throw e;
    }
  }

  async findUserByEmail(email: string) {
    return await this.prismaService.user.findUnique({ where: { email } });
  }

  async findUserById(id: number) {
    return await this.prismaService.user.findUnique({ where: { id } });
  }

  async activateUser(id: number) {
    return await this.prismaService.user.update({
      where: { id },
      data: { emailVerified: true },
    });
  }

  async updateUser(id: number, data: Partial<User>) {
    return this.prismaService.user.update({
      where: { id },
      data,
    });
  }
}
