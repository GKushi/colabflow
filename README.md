# CollabFlow

## Overview

CollabFlow is a project management and team collaboration platform built with NestJS, designed to facilitate effective communication, task organization, and real-time collaboration among teams.

## Key Features

### Authentication & Authorization

- Secure session-based authentication
- Role-Based Access Control (RBAC) with roles: Administrator, Manager, Team Member, Guest

### Database

- Utilizes PostgreSQL with Prisma for relational data management
- Supports transactions, relationships, and migrations

### API Documentation

- Automatic generation using Swagger, accessible at /api-docs

### Rate Limiting

- Implemented via NestJS Throttler to protect against brute-force and DDoS attacks

### File Uploads

- Integration with AWS S3 for secure file storage
- Supports uploading, downloading, and deleting files

### Real-Time Communication

- Uses Socket.IO for live updates, notifications, and team chat

### Email Notifications

- Automated emails for important events via SendGrid or SMTP services

### Automated Backups

- Regular database backups stored securely, e.g., on AWS S3

## Core Modules

### Users

- Registration, login, logout
- Profile management
- Password reset and email verification

### Roles & Permissions

- Assign predefined roles
- Middleware for access control based on roles

### Projects

- Create, edit, delete projects
- Assign users to projects
- Manage project statuses

### Tasks

- CRUD operations for tasks within projects
- Assign tasks to users
- Set priorities, deadlines, statuses

### Comments

- Add comments to tasks
- Support for Markdown formatting

### Files

- Upload and manage files related to tasks and projects

### Notifications

- In-app notifications
- Email alerts for key events

### Chat

- Real-time team communication

### Search

- Advanced search with filters and pagination

## Security Measures

- Input validation using class-validator
- Password encryption with bcrypt

## Testing

- Unit Tests using Jest
- Integration Tests for critical modules

## Deployment

- Docker Compose for development environment
- CI/CD pipelines using GitHub Actions or Jenkins
- Deployment on AWS ECS or Kubernetes

## Todo list

- [ ] User Module

  - [ ] Generate User module, controller, and service
  - [ ] Define User entity (fields: id, name, email, password, role, isVerified, createdAt, updatedAt)
  - [ ] Create Data Transfer Objects (DTOs) for user data validation
  - [ ] Implement user registration with email verification
  - [ ] Implement user login and logout functionality
  - [ ] Implement password reset functionality
  - [ ] Protect routes using authentication guards
  - [ ] Hash passwords using bcrypt
  - [ ] Set up session storage with Redis or MongoDB

- [ ] Role and Permission Module

  - [ ] Define roles: Administrator, Manager, Team Member, Guest
  - [ ] Create Role entity and establish relationships with User entity
  - [ ] Implement Role-Based Access Control (RBAC)
  - [ ] Create custom decorators and guards for role verification
  - [ ] Assign and manage user roles and permissions

- [ ] Authentication and Authorization

  - [ ] Configure session middleware
  - [ ] Implement session-based authentication
  - [ ] Set up secure session configuration (secure cookies, proper expiration)
  - [ ] Implement CSRF protection

- [ ] Project Module

  - [ ] Generate Project module, controller, and service
  - [ ] Define Project entity (fields: id, name, description, status, createdAt, updatedAt)
  - [ ] Create DTOs for project creation and updates
  - [ ] Implement CRUD operations for projects
  - [ ] Establish many-to-many relationship between Projects and Users
  - [ ] Implement project status management (e.g., Active, Completed, On Hold)
  - [ ] Implement pagination and filtering for project listings

- [ ] Task Module

  - [ ] Generate Task module, controller, and service
  - [ ] Define Task entity (fields: id, title, description, status, priority, deadline, assignedUserId, projectId, createdAt, updatedAt)
  - [ ] Create DTOs for task creation and updates
  - [ ] Implement CRUD operations for tasks
  - [ ] Implement assigning tasks to users
  - [ ] Implement task status management (e.g., To Do, In Progress, Done)
  - [ ] Implement real-time updates for task changes using Socket.IO

- [ ] Comment Module

  - [ ] Generate Comment module, controller, and service
  - [ ] Define Comment entity (fields: id, content, authorId, taskId, createdAt, updatedAt)
  - [ ] Create DTOs for comment creation
  - [ ] Implement adding comments to tasks
  - [ ] Support Markdown formatting in comments
  - [ ] Implement real-time comment updates via WebSockets

- [ ] File Module

  - [ ] Integrate AWS SDK for S3 operations
  - [ ] Generate File module, controller, and service
  - [ ] Define File entity (fields: id, fileName, url, taskId, uploadedBy, uploadedAt)
  - [ ] Implement file upload functionality for tasks and projects
  - [ ] Implement secure file storage on AWS S3
  - [ ] Implement file download and deletion endpoints
  - [ ] Ensure files are linked to tasks and users in the database

- [ ] Notification Module

  - [ ] Generate Notification module, controller, and service
  - [ ] Define Notification entity (fields: id, type, message, userId, isRead, createdAt)
  - [ ] Implement email notifications using SendGrid or Nodemailer
  - [ ] Create notification templates for different events (e.g., task assigned, comment added)
  - [ ] Allow users to manage notification preferences

- [ ] Chat Module

  - [ ] Implement real-time chat using Socket.IO
  - [ ] Generate Chat module, controller, and service
  - [ ] Define ChatMessage entity (fields: id, content, senderId, channelId, createdAt)
  - [ ] Implement chat channels (e.g., general, project-specific)
  - [ ] Persist chat messages in the database
  - [ ] Implement message history retrieval and pagination

- [ ] Search Module

  - [ ] Implement search functionality for projects, tasks, and users
  - [ ] Implement filters (e.g., by status, priority, assigned user)
  - [ ] Implement sorting options (e.g., by date, name, priority)
  - [ ] Optimize search queries for performance using indexes
  - [ ] Consider implementing full-text search capabilities

- [ ] API Documentation

  - [ ] Integrate Swagger using @nestjs/swagger
  - [ ] Annotate controllers and DTOs with Swagger decorators
  - [ ] Generate interactive API documentation at /api-docs
  - [ ] Ensure all endpoints, models, and possible responses are documented

- [ ] Rate Limiting and Throttling

  - [ ] Install and configure @nestjs/throttler
  - [ ] Implement global rate limiting for the application
  - [ ] Set up custom rate limits for specific endpoints
  - [ ] Configure rate limits based on user roles and IP addresses
  - [ ] Implement protection against brute-force attacks on authentication endpoints

- [ ] Automated Backups

  - [ ] Set up cron jobs for regular database backups
  - [ ] Configure backup storage on AWS S3 with encryption
  - [ ] Implement backup rotation and retention policies
  - [ ] Test backup and restore procedures

- [ ] Testing

  - [ ] Write unit tests for all services using Jest
  - [ ] Write integration tests for critical modules
  - [ ] Set up end-to-end (E2E) tests for user flows
  - [ ] Use mocking and test databases to isolate tests
  - [ ] Aim for high code coverage and maintain testing reports

- [ ] Deployment

  - [ ] Configure CI/CD pipeline using GitHub Actions or Jenkins
  - [ ] Automate builds, testing, and deployments to staging and production
  - [ ] Deploy application to AWS ECS, EKS, or Kubernetes cluster
  - [ ] Implement logging and monitoring in the production environment

- [ ] Logging

  - [ ] Integrate Winston or Morgan for logging
  - [ ] Set up different log levels (info, warning, error)
  - [ ] Configure log transports to files and external logging services
  - [ ] Implement request logging middleware
  - [ ] Correlate logs with user sessions and requests

- [ ] Email Service

  - [ ] Set up email service using SendGrid or SMTP
  - [ ] Create email templates for various notifications
  - [ ] Implement email queueing and retry mechanisms
  - [ ] Handle email bounces and delivery failures

- [ ] Database Management

  - [ ] Use Prisma migrations for schema changes
  - [ ] Implement transactional operations where necessary
  - [ ] Optimize database queries and indexing
  - [ ] Regularly monitor and analyze database performance
  - [ ] Implement data seeding for development and testing environments

- [ ] Future Enhancements

  - [ ] Add two-factor authentication (2FA) for enhanced security

- [ ] Documentation
  - [ ] Write comprehensive README with setup instructions
  - [ ] Document codebase and architecture decisions
  - [ ] Create contribution guidelines and code of conduct
  - [ ] Maintain changelogs and versioning information
