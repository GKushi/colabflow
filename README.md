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

## Temporary Todo list

- [x] Check if roles are working properly
- [x] Comments are not deleted after task/project deletion
- [ ] Ensure that comments are deleted after user deletion
- [ ] Refinements
  - [ ] Add some optional database fields (e.g. assignedUser in Task model)
  - [x] Authorization checks for specific actions (e.g. only project members can add and see its tasks)

## Todo list

- [x] User Module

  - [x] Generate User module, controller, and service
  - [x] Define User entity (fields: id, name, email, password, role, isVerified, createdAt, updatedAt)
  - [x] Create Data Transfer Objects (DTOs) for user data validation
  - [x] Implement user registration with email verification
  - [x] Implement user login and logout functionality
  - [x] Implement password reset functionality
  - [x] Protect routes using authentication guards
  - [x] Hash passwords using bcrypt
  - [x] Set up session storage

- [x] Role and Permission Module

  - [x] Define roles: Administrator, Manager, Team Member
  - [x] Create Role entity and establish relationships with User entity
  - [x] Create custom decorators and guards for role verification
  - [x] Assign and manage user roles and permissions

- [x] Authentication and Authorization

  - [x] Configure session middleware
  - [x] Implement session-based authentication
  - [x] Set up secure session configuration (secure cookies, proper expiration)

- [x] Project Module

  - [x] Generate Project module, controller, and service
  - [x] Define Project entity (fields: id, name, description, status, createdAt, updatedAt)
  - [x] Create DTOs for project creation and updates
  - [x] Implement CRUD operations for projects
  - [x] Establish many-to-many relationship between Projects and Users

- [x] Task Module

  - [x] Generate Task module, controller, and service
  - [x] Define Task entity (fields: id, title, description, status, priority, deadline, assignedUserId, projectId, createdAt, updatedAt)
  - [x] Create DTOs for task creation and updates
  - [x] Implement CRUD operations for tasks
  - [x] Implement assigning tasks to users
  - [x] Implement task status management (e.g., To Do, In Progress, Done)

- [x] Comment Module

  - [x] Generate Comment module, controller, and service
  - [x] Define Comment entity (fields: id, content, authorId, taskId, createdAt, updatedAt)
  - [x] Create DTOs for comment creation
  - [x] Implement adding comments to tasks

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
  - [ ] Implement pagination
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

  - [x] Set up email service using SendGrid or SMTP
  - [ ] Create email templates for various notifications
  - [ ] Implement email queueing and retry mechanisms
  - [ ] Handle email bounces and delivery failures

- [ ] Database Management

  - [x] Use Prisma migrations for schema changes
  - [ ] Optimize database queries and indexing
  - [x] Implement data seeding for development and testing environments

- [ ] Future Enhancements

  - [ ] Add two-factor authentication (2FA) for enhanced security

- [ ] Documentation
  - [x] Write comprehensive README with setup instructions
  - [ ] Document codebase and architecture decisions
