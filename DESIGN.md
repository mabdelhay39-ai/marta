# DESIGN.md

## Overview

This document outlines the key design decisions made for the User Authentication Service in the Marta case study project.

---

## Architecture

-   **Clean Architecture**: The project follows a clean architecture pattern, separating concerns into controllers, services, repositories, and entities. This ensures maintainability, testability, and scalability.
-   **Dependency Injection**: InversifyJS is used for dependency injection, promoting loose coupling and easier testing.
-   **TypeORM**: Used as the ORM for PostgreSQL, providing a robust and type-safe data access layer.
-   **Express.js**: The HTTP server is built with Express.js, using inversify-express-utils for controller routing and middleware.

---

## Authentication & Security

-   **JWT Authentication**: Stateless authentication is implemented using JWTs for access and refresh tokens. Tokens are signed and verified using secure secrets.
-   **Password Hashing**: Passwords are hashed using scrypt via the PasswordManagerService, ensuring strong security for stored credentials.
-   **Refresh Tokens**: Refresh tokens are stored in the database and rotated on use, reducing the risk of token replay attacks.
-   **Validation**: All input is validated using class-validator decorators on DTOs, preventing invalid or malicious data from entering the system.
-   **Middleware**: Custom authentication middleware validates JWTs and attaches user info to requests for protected routes.

---

## API Design

-   **RESTful Endpoints**: The API exposes clear, RESTful endpoints for registration, login, profile management, and token refresh.
-   **Swagger Documentation**: All endpoints are documented using Swagger JSDoc annotations, and the Swagger UI is available at `/api-docs` for easy exploration and testing.
-   **Error Handling**: Consistent error responses are provided for validation errors, authentication failures, and server errors.

---

## Testing

-   **Unit Tests**: Services are covered by unit tests using Jest, with mocks for dependencies.
-   **Integration Tests**: API endpoints are tested using Supertest to ensure end-to-end correctness.
-   **Coverage**: The goal is to maintain at least 80% test coverage for core business logic.

---

## Docker & Local Development

-   **Docker Compose**: The project includes a Docker Compose setup for local development, orchestrating the app and PostgreSQL containers.
-   **Hot Reload**: Source code is mounted as a volume in development, enabling live reloads with nodemon and tsc -w.
-   **Environment Variables**: All configuration is managed via environment variables, with .env files for local overrides.

---

## Extensibility & Maintainability

-   **SOLID Principles**: The codebase adheres to SOLID principles, making it easy to extend and refactor.
-   **Separation of Concerns**: Each layer (controller, service, repository) has a single responsibility.
-   **OpenAPI/Swagger**: API documentation is auto-generated and easy to extend as new endpoints are added.

---

## Notable Trade-offs

-   **No Email Verification**: For simplicity, email verification is not implemented, but the architecture allows for easy addition.
-   **No Rate Limiting**: Rate limiting is not included by default but can be added via middleware.
-   **No Production-Grade Secrets Management**: Secrets are managed via environment variables; for production, a secrets manager should be used.

---

## Conclusion

This design prioritizes security, maintainability, and developer experience, providing a solid foundation for a production-ready authentication service.
