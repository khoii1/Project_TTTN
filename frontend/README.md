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
- **Routing Protection**: Next.js Middleware

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
- Implemented **Next.js Middleware** (`middleware.ts`) to protect `/dashboard` routes and redirect unauthenticated users to `/login`.

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

## Test Credentials

Use these credentials (seeded in the backend) to log in:

**Sample Company:**
- Admin: `admin@example.com` / `Admin@123`
- Manager: `manager@example.com` / `Manager@123`
- Sales: `sales@example.com` / `Sales@123`

**Rival Org (To test multi-tenancy isolation):**
- Admin: `admin@rival.com` / `Rival@123`

## Known Limitations & Future TODOs
1. **Token Storage Security**: Currently, the token storage uses `js-cookie` which stores tokens in standard browser cookies accessible to JS. This is acceptable for MVP, but for production, the refresh token should be moved to an `HttpOnly` secure cookie set by the backend.
2. **Global Search**: There is no universal search bar in the `AppHeader` to search across all modules simultaneously.
3. **Advanced Analytics**: Dashboard statistics are calculated from the raw lists. Integrating a library like `Recharts` and fetching pre-aggregated data from the backend would improve performance and visuals.
