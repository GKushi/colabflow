import { Session } from 'express-session';

export interface SessionWithUser extends Session {
  isAuthenticated?: boolean;
  user?: {
    id: number;
    email: string;
  };
}
