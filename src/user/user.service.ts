import { ConflictException, Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserData } from './interfaces';
import { Prisma } from '@prisma/client';

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
}
