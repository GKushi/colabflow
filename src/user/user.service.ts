import { InvalidRegisterCredentialsException } from './exceptions';
import { ResourceNotFoundException } from 'src/common/exceptions';
import { PrismaService } from '../prisma/prisma.service';
import { Inject, Injectable } from '@nestjs/common';
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
        if (e.code === 'P2002') throw new InvalidRegisterCredentialsException();
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

  async checkIfUserVerified(id: number) {
    const user = await this.findUserById(id);

    if (!user) throw new ResourceNotFoundException('User', id);

    return user.emailVerified;
  }
}
