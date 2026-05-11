# CRM Frontend

This is a Next.js (App Router) frontend application for a Salesforce-style CRM backend. It is designed to be clean, scalable, and fully connected to the existing backend API.

## Tech Stack

- **Framework**: Next.js 15+ (App Router)
- **Language**: TypeScript
- **UI Library**: Ant Design (antd)
- **Styling**: Tailwind CSS (for layout and utility classes)
- **HTTP Client**: Axios (with custom JWT interceptors)
- **State Management**: Zustand
- **Token Management**: js-cookie
- **Dates**: dayjs
- **Routing Protection**: Next.js Proxy

## Folder Structure

```text
src/
├── app/                  # Next.js App Router (Pages & Layouts)
│   ├── dashboard/        # Protected CRM routes (leads, accounts, tasks, etc.)
│   ├── login/            # Authentication
│   ├── register/         # Registration
│   └── globals.css       # Global styles & Tailwind directives
├── components/           # Reusable UI Components
│   ├── common/           # PageHeaders, DataTables, UI wrappers
│   └── layout/           # DashboardShell, AppSidebar, AppHeader
├── features/             # Feature-based Architecture (Domain logic)
│   ├── auth/             # auth.api.ts, auth.store.ts, auth.types.ts
│   ├── accounts/
│   ├── cases/
│   ├── contacts/
│   ├── leads/
│   ├── opportunities/
│   ├── tasks/
│   └── users/
└── lib/                  # Utilities & Core configurations
    └── api/              # http-client.ts (Axios), token-storage.ts
```

## Setup Instructions

1. Install dependencies:

   ```bash
   npm install
   ```

2. Environment Variables:
   Copy `.env.local.example` to `.env.local`:

   ```bash
   cp .env.local.example .env.local
   ```

   Ensure `NEXT_PUBLIC_API_BASE_URL` points to your backend (default is `http://localhost:3000`).

3. Run the development server:
   ```bash
   npm run dev
   ```

## What was implemented

During this session, the following tasks were completed to build out the frontend from scratch:

### 1. Project Core & Layout

- Initialized Next.js with Tailwind CSS and Ant Design Registry.
- Built a **Dashboard Shell** mimicking an enterprise CRM (Salesforce-style) featuring an `AppSidebar` for navigation and `AppHeader` for User/Organization context.
- Implemented **Next.js Proxy** (`proxy.ts`) to protect `/dashboard` routes and redirect unauthenticated users to `/login`.

### 2. Authentication Flow

- Created robust `/login` and `/register` pages.
- Developed an **Axios Interceptor** (`http-client.ts`) that:
  - Automatically attaches the `Authorization: Bearer` token to every request.
  - Catches `401 Unauthorized` errors.
  - Automatically requests a new access token using the `/auth/refresh` endpoint.
  - Queues failed requests while refreshing, and gracefully logs the user out if the refresh token expires.
- Managed global authentication state using **Zustand** (`auth.store.ts`) and safe cookie storage (`token-storage.ts`).

### 3. Dashboard Homepage

- Created a summary homepage (`/dashboard`) displaying key statistics (Total Leads, Accounts, Opportunities, etc.) calculated from the API.
- Implemented recent activity lists.

### 4. CRM Modules

Built comprehensive CRUD interfaces (List, Create, Detail, Edit) for all core modules:

- **Leads**: Includes status tracking via Ant Design `Steps` and a "Convert Lead" button that connects to the backend conversion endpoint.
- **Accounts**: B2B organizational tracking. Shows nested lists of related Contacts, Opportunities, and Cases.
- **Contacts**: Individual tracking linked to specific Accounts via dynamic dropdowns.
- **Opportunities**: Pipeline management with stage steppers and financial tracking.
- **Tasks**: General task management with priority levels and "Mark Complete" functionality. Related to other CRM entities.
- **Cases**: Customer support ticket tracking with dynamic status and priority.
- **Users**: Admin-restricted user management dashboard (RBAC enforced).
- **Settings**: View current Organization metadata.

### 5. Notes & Activity Timeline

- Built a unified `ActivityTimeline` component that pulls both **Notes** and **Tasks** related to a specific entity (Lead, Account, Contact, Opportunity, Case).
- Users can add notes and tasks directly from the timeline view on any detail page.

### 6. UI/UX Refinements

- Implemented `PageHeader` components across all modules for a consistent look.
- Added loading spinners, empty states, and dynamic confirmation dialogs (`Popconfirm`) for deletions.
- Normalized backend API error messages into user-friendly `antd` toast notifications.

### 7. Pagination & Data Fetching

- **Server-Side Pagination:** Integrated server-side pagination, search, and filtering capabilities in the `Leads` module, synced with URL parameters (e.g. `?page=1&limit=10&search=abc`).
- **Scalable APIs:** Upgraded all `getAll` API handlers (Accounts, Contacts, Opportunities, Tasks, Cases, Users) to accept dynamic query parameters (`page`, `limit`, `search`, etc.), paving the way for full server-side processing across the application.

## QA & Testing

A comprehensive manual QA checklist is available at `docs/frontend-qa-checklist.md`.

Shared contract docs:

- `../docs/api-contract.md`
- `../docs/fullstack-qa-checklist.md`

## Test Credentials

Use these credentials (seeded in the backend) to log in:

**Sample Company:**

- Admin: `admin@example.com` / `Admin@123`
- Manager: `manager@example.com` / `Manager@123`
- Sales: `sales@example.com` / `Sales@123`

**Rival Org (To test multi-tenancy isolation):**

- Admin: `admin@rival.com` / `Rival@123`

## API Contract Alignment (Phase 2)

### Recent Fixes

1. **Task Field Name**: Changed frontend field from `title` to `subject` to match backend DTO.
2. **Entity Type Alignment**: Updated all TypeScript types to include missing backend fields:
   - **Lead**: Added `title`, `website`, `source`, `industry`, `description`, `ownerId`, `convertedAccountId`, `convertedContactId`, `convertedOpportunityId`
   - **Account**: Added `type`, `description`, plus complete billing/shipping address fields
   - **Contact**: Added `description` and mailing address fields
   - **Opportunity**: Added `nextStep`, `description`, `ownerId`
   - **Task**: Added `ownerId`, `assignedToId`, `completedAt`, `deletedAt`
   - **Note**: Changed `authorId` to `ownerId` to match backend
3. **Pagination Response Handling**: All list endpoints now properly handle backend paginated response format `{ data: T[], meta: {...} }` with fallback to raw arrays for legacy endpoints.
4. **Dashboard Pagination**: Fixed dashboard to use `meta.total` instead of `.length` for accurate statistics.
5. **Pagination Helper**: Created `lib/api/pagination.ts` with utilities to parse paginated responses safely.

### API Response Format

Backend APIs return paginated data in the following format:

```json
{
  "data": [
    /* items */
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

Frontend helpers (`pagination.ts`) automatically handle both paginated and raw array responses.

## Current Limitations & Future TODOs

1. **Token Storage Security**: The MVP still stores access and refresh tokens with `js-cookie`. For production, move refresh tokens to secure `HttpOnly` cookies set by the backend.
2. **Dashboard Date Filtering**: Dashboard analytics use dedicated backend endpoints, but there is no date range filter yet.
3. **Global Search MVP**: Global Search is implemented in the `AppHeader` by querying existing list endpoints in parallel. A backend aggregate search endpoint with ranking/highlighting is still future work.
4. **Recycle Bin Scope**: Recycle Bin is implemented for Leads, Accounts, Contacts, Opportunities, Tasks, and Cases. Users and Notes are soft-deleted by backend behavior but are not part of the current Recycle Bin UI.
5. **Mobile App**: Flutter mobile app is not implemented yet.
