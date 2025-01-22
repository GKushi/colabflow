import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { SessionWithUser } from '../../auth/interfaces';
import { TaskService } from '../task.service';

@Injectable()
export class TaskAccessGuard implements CanActivate {
  constructor(private taskService: TaskService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const session: SessionWithUser = request.session;
    const taskId = parseInt(request.params.id);

    if (!taskId) {
      throw new NotFoundException('Task not found');
    }

    if (!session.user) {
      throw new UnauthorizedException('User not found');
    }

    await this.taskService.checkIfUserCanAccessTask(session.user, taskId);

    return true;
  }
}
