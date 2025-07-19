import type { SessionWithUser } from './request-with-session.interface';
import type { Socket } from 'socket.io';

export interface SocketWithSession extends Socket {
  session: SessionWithUser;
}
