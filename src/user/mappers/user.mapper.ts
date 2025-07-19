import { User } from '@prisma/client';

export class UserMapper {
  static toPublic(user: User) {
    return { id: user.id, email: user.email, nickName: user.nickName };
  }

  static multipleToPublic(users: { user: User }[]) {
    return users.map((user) => this.toPublic(user.user));
  }
}
