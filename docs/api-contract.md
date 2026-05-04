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
- `GET /leads?deleted=true`
- `POST /leads`
- `GET /leads/:id`
- `PATCH /leads/:id`
- `PATCH /leads/:id/status`
- `POST /leads/:id/convert`
- `PATCH /leads/:id/restore`
- `DELETE /leads/:id`

Lead conversion:

- `POST /leads/:id/convert`
- Empty body keeps the default behavior: create a new Account, Contact, and Opportunity from the Lead.
- Optional wizard body:

```json
{
  "accountMode": "CREATE_NEW",
  "accountId": "existing-account-id",
  "contactMode": "CREATE_NEW",
  "contactId": "existing-contact-id",
  "opportunityMode": "CREATE_NEW",
  "opportunityId": "existing-opportunity-id",
  "opportunityName": "New Opportunity - Tech Corp"
}
```

Supported modes:

- `accountMode`: `CREATE_NEW` or `USE_EXISTING`
- `contactMode`: `CREATE_NEW` or `USE_EXISTING`
- `opportunityMode`: `CREATE_NEW`, `USE_EXISTING`, or `DO_NOT_CREATE`

Rules:

- Conversion runs in a transaction.
- Lead must belong to the current organization and must not already be `CONVERTED`.
- Existing Account, Contact, and Opportunity IDs are validated in the current organization.
- Converted Lead response includes `convertedAccountId`, `convertedContactId`, and `convertedOpportunityId` when an Opportunity exists.
- Source propagation: new Account, Contact, and Opportunity use `Lead.source`, or `CONVERTED_LEAD` when Lead has no source; `sourceDetail` is copied from Lead.

### Accounts

- `GET /accounts`
- `GET /accounts?deleted=true`
- `POST /accounts`
- `GET /accounts/:id`
- `PATCH /accounts/:id`
- `PATCH /accounts/:id/restore`
- `DELETE /accounts/:id`

### Contacts

- `GET /contacts`
- `GET /contacts?deleted=true`
- `POST /contacts`
- `GET /contacts/:id`
- `PATCH /contacts/:id`
- `PATCH /contacts/:id/restore`
- `DELETE /contacts/:id`

### Opportunities

- `GET /opportunities`
- `GET /opportunities?deleted=true`
- `POST /opportunities`
- `GET /opportunities/:id`
- `PATCH /opportunities/:id`
- `PATCH /opportunities/:id/stage`
- `PATCH /opportunities/:id/restore`
- `DELETE /opportunities/:id`

### Tasks

- `GET /tasks`
- `GET /tasks?deleted=true`
- `POST /tasks`
- `GET /tasks/:id`
- `PATCH /tasks/:id`
- `PATCH /tasks/:id/complete`
- `PATCH /tasks/:id/restore`
- `DELETE /tasks/:id`

Notes:
- `GET /<resource>` returns active records where `deletedAt = null`.
- `GET /<resource>?deleted=true` returns soft-deleted records where `deletedAt != null`.
- `DELETE /<resource>/:id` is soft delete and sets `deletedAt`.
- `PATCH /<resource>/:id/restore` restores a soft-deleted record by setting `deletedAt = null`.
- Restore is scoped by `organizationId`; a record outside the current organization returns 404.
- Restoring an already active record is idempotent and returns the current record.
- Recycle Bin uses the deleted list endpoints for Leads, Accounts, Contacts, Opportunities, Tasks, and Cases.

### Notes

- `GET /notes`
- `POST /notes`
- `GET /notes/:id`
- `PATCH /notes/:id`
- `DELETE /notes/:id`

### Cases

- `GET /cases`
- `GET /cases?deleted=true`
- `POST /cases`
- `GET /cases/:id`
- `PATCH /cases/:id`
- `PATCH /cases/:id/status`
- `PATCH /cases/:id/restore`
- `DELETE /cases/:id`

## Query Params Supported by List Endpoints

- `page`
- `limit`
- `search`
- `status`
- `stage`
- `priority`
- `deleted` for Recycle Bin resources (`true` returns soft-deleted Leads, Accounts, Contacts, Opportunities, Tasks, and Cases)
- `role`
- `relatedId`

Note: `relatedType` exists on Note/Task records, but the current backend Notes list endpoint only supports filtering by `relatedId`.

## Entity Enums

## CRM Source Fields

The following entities support source tracking:

- Lead
- Account
- Contact
- Opportunity
- Case

Fields:

- `source?: string`
- `sourceDetail?: string`

Supported `source` values:

- `MANUAL`
- `WEBSITE`
- `FACEBOOK`
- `GOOGLE_ADS`
- `ZALO`
- `EMAIL`
- `PHONE`
- `REFERRAL`
- `EVENT`
- `IMPORT_CSV`
- `CHATBOT`
- `API`
- `CONVERTED_LEAD`
- `OTHER`

List endpoints for these entities support optional source filtering:

- `GET /leads?source=FACEBOOK`
- `GET /accounts?source=WEBSITE`
- `GET /contacts?source=REFERRAL`
- `GET /opportunities?source=FACEBOOK`
- `GET /cases?source=EMAIL`

Lead conversion source propagation:

- Converted Account, Contact, and Opportunity inherit `Lead.source`.
- If the Lead has no source, converted records use `CONVERTED_LEAD`.
- Converted Account, Contact, and Opportunity inherit `Lead.sourceDetail`.

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
