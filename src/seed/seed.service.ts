import { PrismaService } from '../prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  private readonly UserCount = 10;
  private readonly UserPassword = '123123';
  private readonly ProjectCount = 3;

  constructor(private prismaService: PrismaService) {}

  async run() {
    await this.seedUsers(this.UserCount);
    await this.seedProjects(this.ProjectCount);
    await this.linkUsersToProjects(this.UserCount, this.ProjectCount);
  }

  private async seedUsers(count: number) {
    const passwordHash = await bcrypt.hash(this.UserPassword, 10);
    const users = faker.helpers
      .multiple(this.generateUser, {
        count,
      })
      .map((user) => ({ ...user, passwordHash }));
    await this.prismaService.user.createMany({ data: users });
  }

  private generateUser() {
    const userData = {
      email: faker.internet.email().toLowerCase(),
      nickName: faker.internet.username(),
      firstName: faker.person.firstName(),
      lastName: faker.person.lastName(),
      emailVerified: faker.datatype.boolean(),
      passwordHash: '',
      role: faker.helpers.enumValue(Role),
    };

    return userData;
  }

  private async seedProjects(count: number) {
    const generatedProjects = faker.helpers.multiple(this.generateProject, {
      count: count,
    });

    await this.prismaService.project.createMany({
      data: generatedProjects,
    });
  }

  private generateProject() {
    const projectData = {
      name: faker.commerce.productName(),
      description: faker.commerce.productDescription(),
    };

    return projectData;
  }

  private async linkUsersToProjects(userCount: number, projectCount: number) {
    const lastProjectsIds = await this.getLatestIds(
      this.prismaService.project,
      projectCount,
    );

    const lastUsersIds = await this.getLatestIds(
      this.prismaService.user,
      userCount,
    );

    for (let i = 0; i < lastUsersIds.length; i++) {
      const projectId = lastProjectsIds[Math.floor(i / lastProjectsIds.length)];

      if (!projectId?.id) return;

      await this.prismaService.project.update({
        where: { id: projectId.id },
        data: { users: { create: { userId: lastUsersIds[i].id } } },
      });
    }
  }

  private getLatestIds<T extends { findMany: (options: any) => Promise<any> }>(
    model: T,
    count: number,
  ) {
    return model.findMany({
      orderBy: { createdAt: 'desc' },
      take: count,
      select: { id: true },
    }) as Promise<{ id: number }[]>;
  }
}
