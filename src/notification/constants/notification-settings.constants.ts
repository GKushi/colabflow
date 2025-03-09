import { NotificationType } from '../interfaces/notification-type.interface';

export const NotificationMailingSettings: { [K in NotificationType]: boolean } =
  {
    [NotificationType.TaskAssigned]: true,
    [NotificationType.TaskChanged]: true,
    [NotificationType.TaskCommented]: true,
    [NotificationType.ProjectAssigned]: true,
    [NotificationType.ProjectChanged]: true,
    [NotificationType.ProjectCommented]: true,
  };
