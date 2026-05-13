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
5. `POST /auth/logout` clears the backend refresh token hash, then the frontend clears local tokens.

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

### Health

- `GET /health`

Response:

```json
{
  "status": "ok",
  "timestamp": "2026-05-13T10:00:00.000Z",
  "service": "crm-backend"
}
```

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`

Logout:

- `POST /auth/logout` is protected by the access token in `Authorization: Bearer <accessToken>`.
- The backend clears the current user's `refreshTokenHash`.
- The frontend calls this endpoint first, then clears local `js-cookie` tokens and auth state.
- If the logout API fails because the token is expired or invalid, the frontend still clears the local session and redirects to `/login`.

### Organizations

- `GET /organizations/me`

### Dashboard

- `GET /dashboard/summary`
- `GET /dashboard/leads-by-status`
- `GET /dashboard/opportunities-by-stage`
- `GET /dashboard/cases-by-priority`
- `GET /dashboard/upcoming-tasks`

Dashboard endpoints are protected by `Authorization: Bearer <accessToken>`, scoped by the current user's `organizationId`, and exclude soft-deleted records.

`GET /dashboard/summary` response:

```json
{
  "totalLeads": 0,
  "totalAccounts": 0,
  "totalContacts": 0,
  "totalOpportunities": 0,
  "openOpportunitiesValue": 0,
  "closedWonValue": 0,
  "openTasks": 0,
  "overdueTasks": 0,
  "openCases": 0
}
```

`GET /dashboard/leads-by-status` response:

```json
[
  { "status": "NEW", "count": 10 },
  { "status": "CONTACTED", "count": 5 }
]
```

`GET /dashboard/opportunities-by-stage` response:

```json
[
  { "stage": "QUALIFY", "count": 5, "amount": 10000 },
  { "stage": "CLOSED_WON", "count": 1, "amount": 5000 }
]
```

Amount fields are numeric values in API payloads and responses. The backend does not format or localize currency strings. The frontend displays opportunity and dashboard amount values as Vietnamese Dong using `vi-VN` currency formatting, for example `85000000` displays as `85.000.000 ₫`.

`GET /dashboard/cases-by-priority` response:

```json
[
  { "priority": "LOW", "count": 3 },
  { "priority": "URGENT", "count": 1 }
]
```

`GET /dashboard/upcoming-tasks?limit=5` returns upcoming open tasks due from today onward, ordered by due date.

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
- `GET /leads/:id/conversion-suggestions`
- `POST /leads/:id/convert`
- `PATCH /leads/:id/restore`
- `DELETE /leads/:id`

Lead conversion:

- `GET /leads/:id/conversion-suggestions`
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
- Existing Account, Contact, and Opportunity must not be soft-deleted.
- When using an existing Contact, `contact.accountId` must match the selected or newly created final Account ID. Otherwise the backend returns `400` with `Selected contact does not belong to the selected account.`
- When using an existing Opportunity, `opportunity.accountId` must match the selected or newly created final Account ID. Otherwise the backend returns `400` with `Selected opportunity does not belong to the selected account.`
- When `opportunityMode = DO_NOT_CREATE`, `convertedOpportunityId` is `null`.
- Converted Lead response includes `convertedAccountId`, `convertedContactId`, `convertedOpportunityId` when an Opportunity exists, plus backend-managed action tracking fields `convertedAt` and `convertedById`.
- Source propagation: new Account, Contact, and Opportunity use `Lead.source`, or `CONVERTED_LEAD` when Lead has no source; `sourceDetail` is copied from Lead.
- The frontend does not send `convertedAt` or `convertedById`; the backend sets them from the authenticated user and conversion timestamp.

Conversion suggestions:

```json
{
  "accounts": [],
  "contacts": [],
  "opportunities": []
}
```

- Accounts are suggested from active records in the current organization where `name` contains `Lead.company`.
- Contacts are suggested from active records in the current organization where email equals `Lead.email`, phone equals `Lead.phone`, or last name contains `Lead.lastName`.
- Opportunities are suggested from active records in the current organization where stage is not `CLOSED_WON` or `CLOSED_LOST` and name contains `Lead.company`.
- Suggestions are advisory duplicate prevention for the wizard; backend relationship validation remains the source of truth during conversion.

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
- `GET /contacts?accountId=<account-id>`
- `POST /contacts`
- `GET /contacts/:id`
- `PATCH /contacts/:id`
- `PATCH /contacts/:id/restore`
- `DELETE /contacts/:id`

### Opportunities

- `GET /opportunities`
- `GET /opportunities?deleted=true`
- `GET /opportunities?accountId=<account-id>`
- `GET /opportunities?contactId=<contact-id>`
- `POST /opportunities`
- `GET /opportunities/:id`
- `PATCH /opportunities/:id`
- `PATCH /opportunities/:id/stage`
- `PATCH /opportunities/:id/restore`
- `DELETE /opportunities/:id`

Notes:

- `PATCH /opportunities/:id/stage` sets backend-managed action tracking fields `stageChangedAt` and `stageChangedById` from the authenticated user and update timestamp.
- The frontend does not send `stageChangedAt` or `stageChangedById`.

### Tasks

- `GET /tasks`
- `GET /tasks?deleted=true`
- `GET /tasks?relatedType=LEAD&relatedId=<lead-id>`
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
- Recycle Bin-capable responses include backend-managed fields `deletedById`, `restoredAt`, and `restoredById`.
- `DELETE /<resource>/:id` sets `deletedAt` and `deletedById` from the authenticated user.
- `PATCH /<resource>/:id/restore` clears `deletedAt` and sets `restoredAt` / `restoredById` from the authenticated user. `deletedById` is preserved for historical context.
- The frontend does not send `deletedById`, `restoredAt`, or `restoredById`.
- Task update currently supports subject, dueDate, priority, description, and assignedToId only. `relatedType` and `relatedId` are set on create and are displayed read-only on the Task detail screen until the backend supports relation updates.
- `PATCH /tasks/:id/complete` sets backend-managed action tracking fields `completedAt` and `completedById` when status becomes `COMPLETED`. If the task is moved away from `COMPLETED`, both fields are cleared. If an already completed task is completed again, the original completion actor/time are preserved.
- The frontend does not send `completedAt` or `completedById`; the backend sets them from the authenticated user and completion timestamp.

### Notes

- `GET /notes`
- `GET /notes?relatedType=LEAD&relatedId=<lead-id>`
- `POST /notes`
- `GET /notes/:id`
- `PATCH /notes/:id`
- `DELETE /notes/:id`

### Cases

- `GET /cases`
- `GET /cases?deleted=true`
- `GET /cases?accountId=<account-id>`
- `GET /cases?contactId=<contact-id>`
- `POST /cases`
- `GET /cases/:id`
- `PATCH /cases/:id`
- `PATCH /cases/:id/status`
- `PATCH /cases/:id/restore`
- `DELETE /cases/:id`

Notes:

- `PATCH /cases/:id/status` sets backend-managed action tracking fields `closedAt` and `closedById` when status becomes `CLOSED`.
- If a Case is moved away from `CLOSED`, `closedAt` and `closedById` are cleared.
- The frontend does not send `closedAt` or `closedById`.

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
- `relatedType`
- `accountId` for Contacts, Opportunities, and Cases related lists
- `contactId` for Opportunities and Cases related lists

Notes and Tasks list endpoints support filtering by `relatedType`, `relatedId`, or both. Activity Timeline uses these filters instead of fetching broad task/note pages and filtering client-side.

Contacts, Opportunities, and Cases list endpoints support relationship filters for related lists:

- `GET /contacts?accountId=<account-id>`
- `GET /opportunities?accountId=<account-id>`
- `GET /opportunities?contactId=<contact-id>`
- `GET /cases?accountId=<account-id>`
- `GET /cases?contactId=<contact-id>`

These filters remain scoped by the current user's `organizationId`, honor active/deleted behavior, and return the standard paginated `{ data, meta }` response.

Frontend Global Search uses existing list endpoints in parallel with `search`, `page=1`, and `limit=5`:

- `GET /leads?search=<q>&page=1&limit=5`
- `GET /accounts?search=<q>&page=1&limit=5`
- `GET /contacts?search=<q>&page=1&limit=5`
- `GET /opportunities?search=<q>&page=1&limit=5`
- `GET /cases?search=<q>&page=1&limit=5`
- `GET /tasks?search=<q>&page=1&limit=5`

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

The `source` filter can be combined with pagination and existing list filters, for example:

- `GET /leads?page=1&limit=10&status=QUALIFIED&source=FACEBOOK`
- `GET /opportunities?page=1&limit=10&stage=QUALIFY&source=REFERRAL`
- `GET /cases?page=1&limit=10&priority=HIGH&source=EMAIL`

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
- Case does not expose `assignedToId`; frontend screens should not display an assigned user for cases unless the backend adds that field.

## Known Limitations

- `js-cookie` token storage is MVP only; production should move refresh tokens to `HttpOnly` secure cookies.
- Dashboard analytics use dedicated backend endpoints, but date range filtering is not implemented yet.
- Frontend Global Search is implemented as MVP parallel search against existing list endpoints. A backend aggregate search endpoint with ranking/highlighting is future work.
- Recycle Bin supports Leads, Accounts, Contacts, Opportunities, Tasks, and Cases. Users and Notes are not part of the current Recycle Bin UI.
- Some endpoints still allow raw-array fallback in the frontend for backward compatibility, but the preferred contract is paginated `{ data, meta }`.
- Flutter mobile app is not implemented yet.
