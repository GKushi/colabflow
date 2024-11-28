import { Role as RoleEnum } from '@prisma/client';
import { SetMetadata } from '@nestjs/common';

export const Role = (role: RoleEnum) => SetMetadata('role', role);
