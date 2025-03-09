import { NotificationType } from '../interfaces/notification-type.interface';

export const NotificationEmailContent: {
  [K in NotificationType]: {
    subject: string;
    content: (endpoint: string) => string;
  };
} = {
  [NotificationType.TaskAssigned]: {
    subject: 'You have been assigned to a task',
    content: (endpoint: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 20px;">You have been assigned to a task</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Click the button below to view the task:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${endpoint}" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Take me to the task
            </a>
          </div>
        </div>
    `,
  },

  [NotificationType.TaskChanged]: {
    subject: 'A task you are following has been changed',
    content: (endpoint: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 20px;">A task you are following has been changed</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Click the button below to view the task:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${endpoint}" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Take me to the task
            </a>
          </div>
        </div>
    `,
  },

  [NotificationType.TaskCommented]: {
    subject: 'A task you are following has a new comment',
    content: (endpoint: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 20px;">A task you are following has a new comment</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Click the button below to view the task:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${endpoint}" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Take me to the task
            </a>
          </div>
        </div>
    `,
  },

  [NotificationType.ProjectAssigned]: {
    subject: 'You have been assigned to a project',
    content: (endpoint: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 20px;">You have been assigned to a project</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Click the button below to view the project:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${endpoint}" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Take me to the project
            </a>
          </div>
        </div>
    `,
  },

  [NotificationType.ProjectChanged]: {
    subject: 'A project you are following has been changed',
    content: (endpoint: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 20px;">A project you are following has been changed</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Click the button below to view the project:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${endpoint}" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Take me to the project
            </a>
          </div>
        </div>
    `,
  },

  [NotificationType.ProjectCommented]: {
    subject: 'A project you are following has a new comment',
    content: (endpoint: string) => `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #333; margin-bottom: 20px;">A project you are following has a new comment</h1>
          <p style="color: #666; font-size: 16px; line-height: 1.5;">
            Click the button below to view the project:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${endpoint}" 
               style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
              Take me to the project
            </a>
          </div>
        </div>
    `,
  },
};
