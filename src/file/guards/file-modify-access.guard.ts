import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionWithUser } from '../../auth/interfaces';
import { FileService } from '../file.service';

@Injectable()
export class FileModifyAccessGuard implements CanActivate {
  constructor(private fileService: FileService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session: SessionWithUser = request.session;
    const fileId = parseInt(request.params.id);

    if (!fileId) {
      throw new NotFoundException('File Id not found');
    }

    if (!session.user) {
      throw new UnauthorizedException('User not found');
    }

    await this.fileService.checkModifyAccess(session.user, fileId);

    return true;
  }
}
