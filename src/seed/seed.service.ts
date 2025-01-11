import { PrismaService } from '../prisma/prisma.service';
import { Priority, Role, Status } from '@prisma/client';
import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  private readonly UserCount = 25;
  private readonly UserPassword = '123123';
  private readonly ProjectCount = 5;
  private readonly TaskCount = 50;

  constructor(private prismaService: PrismaService) {}

  async run() {
    await this.seedUsers(this.UserCount);
    await this.seedProjects(this.ProjectCount);
    await this.linkProjects(this.UserCount, this.ProjectCount);
    await this.seedTasks(this.TaskCount);
    await this.linkTasks(this.TaskCount, this.ProjectCount);
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

  private async linkProjects(userCount: number, projectCount: number) {
    const lastProjectsIds = await this.getLatestIds(
      this.prismaService.project,
      projectCount,
    );

    const lastUsersIds = await this.getLatestIds(
      this.prismaService.user,
      userCount,
    );

    for (let i = 0; i < lastUsersIds.length; i++) {
      const projectId =
        lastProjectsIds[
          faker.number.int({ min: 0, max: lastProjectsIds.length - 1 })
        ];

      if (!projectId.id || !lastUsersIds[i].id) continue;

      await this.prismaService.project.update({
        where: { id: projectId.id },
        data: { users: { create: { userId: lastUsersIds[i].id } } },
      });
    }
  }

  private async seedTasks(count: number) {
    const generatedTasks = faker.helpers.multiple(this.generateTask, {
      count: count,
    });

    await this.prismaService.task.createMany({
      data: generatedTasks,
    });
  }

  private generateTask() {
    const taskData = {
      title: faker.lorem.lines(1),
      description: faker.lorem.sentences(),
      status: faker.helpers.enumValue(Status),
      priority: faker.helpers.enumValue(Priority),
      deadline: faker.date.future(),
      projectId: 1,
      assignedToId: 1,
      createdById: 1,
    };

    return taskData;
  }

  private async linkTasks(taskCount: number, projectCount: number) {
    const lastTasksIds = await this.getLatestIds(
      this.prismaService.task,
      taskCount,
    );

    const lastProjectIds = await this.getLatestIds(
      this.prismaService.project,
      projectCount,
    );

    for (let i = 0; i < lastTasksIds.length; i++) {
      const projectId =
        lastProjectIds[
          faker.number.int({ min: 0, max: lastProjectIds.length - 1 })
        ];

      const projectUsers = await this.prismaService.project.findUnique({
        where: { id: projectId.id },
        select: { users: { select: { userId: true } } },
      });

      if (!projectUsers) continue;

      const users = projectUsers.users.map((user) => user.userId);

      const assignedTo =
        users[faker.number.int({ min: 0, max: users.length - 1 })];

      const createdBy =
        users[faker.number.int({ min: 0, max: users.length - 1 })];

      if (!lastTasksIds[i].id || !projectId.id || !assignedTo || !createdBy)
        continue;

      await this.prismaService.task.update({
        where: { id: lastTasksIds[i].id },
        data: {
          assignedTo: { connect: { id: assignedTo } },
          createdBy: { connect: { id: createdBy } },
          project: { connect: { id: projectId.id } },
        },
      });
    }
  }
}
