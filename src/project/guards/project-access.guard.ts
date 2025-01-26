import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionWithUser } from '../../auth/interfaces';
import { ProjectService } from '../project.service';

@Injectable()
export class ProjectAccessGuard implements CanActivate {
  constructor(private projectService: ProjectService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session: SessionWithUser = request.session;
    const projectId = parseInt(request.params.id);

    if (!projectId) {
      throw new NotFoundException('Project ID not found');
    }

    if (!session.user) {
      throw new UnauthorizedException('User not found');
    }

    await this.projectService.checkAccess(session.user, projectId);

    return true;
  }
}
