import type { Role } from '@prisma/client';

export interface UserInSession {
  id: number;
  email: string;
  role: Role;
}
