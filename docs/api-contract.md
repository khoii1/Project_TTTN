# API Contract

This document defines the shared contract between the NestJS backend and the Next.js frontend.

## Base URLs

- Backend base URL: `http://localhost:3000`
- Frontend base URL: `http://localhost:3001` (or the port configured for the Next.js dev server)

## Auth Flow

1. `POST /auth/register` creates a new organization and first user.
2. `POST /auth/login` returns an access token, refresh token, and user profile.
3. The frontend stores tokens in `js-cookie` for the MVP.
4. `POST /auth/refresh` exchanges a refresh token for a new token pair.
5. `POST /auth/logout` clears the authenticated session on the client.

## Authorization Header

- Format: `Authorization: Bearer <accessToken>`
- All protected requests must include the access token.

## Standard Paginated Response

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

## Standard Error Response

Backend errors follow the global exception filter shape:

```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "error": "Bad Request",
  "timestamp": "2026-05-03T10:00:00.000Z",
  "path": "/leads"
}
```

- `message` may be a string or an array of validation messages.

## CRM Endpoints

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

### Organizations

- `GET /organizations/me`

### Users

- `GET /users`
- `POST /users`
- `GET /users/:id`
- `PATCH /users/:id`
- `DELETE /users/:id`

### Leads

- `GET /leads`
- `POST /leads`
- `GET /leads/:id`
- `PATCH /leads/:id`
- `PATCH /leads/:id/status`
- `POST /leads/:id/convert`
- `DELETE /leads/:id`

### Accounts

- `GET /accounts`
- `POST /accounts`
- `GET /accounts/:id`
- `PATCH /accounts/:id`
- `DELETE /accounts/:id`

### Contacts

- `GET /contacts`
- `POST /contacts`
- `GET /contacts/:id`
- `PATCH /contacts/:id`
- `DELETE /contacts/:id`

### Opportunities

- `GET /opportunities`
- `POST /opportunities`
- `GET /opportunities/:id`
- `PATCH /opportunities/:id`
- `PATCH /opportunities/:id/stage`
- `DELETE /opportunities/:id`

### Tasks

- `GET /tasks`
- `POST /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id`
- `PATCH /tasks/:id/complete`
- `DELETE /tasks/:id`

### Notes

- `GET /notes`
- `POST /notes`
- `GET /notes/:id`
- `PATCH /notes/:id`
- `DELETE /notes/:id`

### Cases

- `GET /cases`
- `POST /cases`
- `GET /cases/:id`
- `PATCH /cases/:id`
- `PATCH /cases/:id/status`
- `DELETE /cases/:id`

## Query Params Supported by List Endpoints

- `page`
- `limit`
- `search`
- `status`
- `stage`
- `priority`
- `role`
- `relatedId`
- `relatedType`

## Entity Enums

### UserRole

- `ADMIN`
- `MANAGER`
- `SALES`
- `SUPPORT`

### LeadStatus

- `NEW`
- `CONTACTED`
- `NURTURING`
- `QUALIFIED`
- `UNQUALIFIED`
- `CONVERTED`

### OpportunityStage

- `QUALIFY`
- `PROPOSE`
- `NEGOTIATE`
- `CLOSED_WON`
- `CLOSED_LOST`

### TaskStatus

- `NOT_STARTED`
- `IN_PROGRESS`
- `COMPLETED`
- `CANCELLED`

### TaskPriority

- `LOW`
- `NORMAL`
- `HIGH`

### CaseStatus

- `NEW`
- `WORKING`
- `RESOLVED`
- `CLOSED`

### CasePriority

- `LOW`
- `MEDIUM`
- `HIGH`
- `URGENT`

### RelatedType

- `LEAD`
- `ACCOUNT`
- `CONTACT`
- `OPPORTUNITY`
- `CASE`

## Important Field Naming

- Task uses `subject`, not `title`.
- Account uses `type`, not `industry`.
- Note uses `ownerId`, not `authorId`, unless the backend explicitly returns author details.

## Known Limitations

- `js-cookie` token storage is MVP only; production should move refresh tokens to `HttpOnly` secure cookies.
- `ownerId` is still displayed in many places instead of owner name.
- Global search is not implemented yet.
- Dashboard analytics are basic and rely on list endpoints rather than dedicated aggregate APIs.
- Some endpoints still allow raw-array fallback in the frontend for backward compatibility, but the preferred contract is paginated `{ data, meta }`.
