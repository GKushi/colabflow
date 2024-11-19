import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { LoginDto, RegisterDto } from './dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private userService: UserService) {}

  private async hashPassword(password: string) {
    return bcrypt.hash(password, 10);
  }

  private async comparePassword(password: string, hash: string) {
    return bcrypt.compare(password, hash);
  }

  async register(registerDto: RegisterDto) {
    const { password, ...userData } = registerDto;
    const passwordHash = await this.hashPassword(password);
    return this.userService.createUser({ ...userData, passwordHash });
  }

  async login(loginDto: LoginDto) {
    const foundUser = await this.userService.findUserByEmail(loginDto.email);
    if (!foundUser) throw new UnauthorizedException('Invalid credentials');
    if (!this.comparePassword(loginDto.password, foundUser.passwordHash))
      throw new UnauthorizedException('Invalid credentials');
    return foundUser;
  }
}
