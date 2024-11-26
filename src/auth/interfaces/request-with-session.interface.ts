import { UserInSession } from './user-in-session.interface';
import { Session } from 'express-session';

export interface SessionWithUser extends Session {
  isAuthenticated?: boolean;
  user?: UserInSession;
}
