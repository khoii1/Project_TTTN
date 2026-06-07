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
│   ├── dang-ky-tu-van/   # Public Web-to-Lead consultation form
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
- **Settings**: View organization/account details, Web-to-Lead integration information, Lead assignment rules, Task Templates after conversion, and change the current user's password.

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
- `../docs/demo-script.md`
- `../docs/deployment-guide.md`

## Current MVP Status

- Vietnamese UI is implemented across the main CRM screens.
- Dashboard Analytics is implemented with dedicated backend endpoints.
- Global Search is available in the AppHeader.
- Recycle Bin is available for Leads, Accounts, Contacts, Opportunities, Tasks, and Cases.
- CSV Import is available on the Leads, Accounts, Contacts, Opportunities, Tasks, and Cases list pages with reusable modal UI, sample CSV download, per-row result summary, and list reload after successful or partially successful imports.
- Web-to-Lead is available at `/dang-ky-tu-van` as a public consultation form that creates a new Lead with `source = Website`.
- Task Templates after Lead conversion are available at `/dashboard/settings/task-templates`; the Convert Wizard can create follow-up Tasks from an active/default template.
- Task detail has a `Trao đổi` tab for internal comments and attachments. Files are uploaded through the backend to private Supabase Storage and displayed with temporary signed URLs.
- Profile dropdown shows the signed-in user's name, email, role, current organization, a Settings shortcut, and Logout.
- `/dashboard/settings` is organized into cards for Organization, Account, Website integration, and Change Password.
- Actor Tracking is available for important actions such as completing tasks, converting leads, changing opportunity stage, closing cases, deleting, and restoring records.
- Opportunity and dashboard amount values are displayed as VNĐ/VND on the frontend while the backend keeps numeric `amount` values.
- Supabase Free deployment preparation is documented in `../docs/deployment-guide.md`.

## CSV Import UI

The web CRM supports CSV import on these list pages:

- `/dashboard/leads`
- `/dashboard/accounts`
- `/dashboard/contacts`
- `/dashboard/opportunities`
- `/dashboard/tasks`
- `/dashboard/cases`

Each page shows an `Import CSV` button in the page header next to the create button. Clicking it opens a Vietnamese import modal.

Import flow:

1. Click `Import CSV` on one of the six list pages.
2. Click `Tải file mẫu CSV` to download the module-specific sample CSV template.
3. Choose or drag a `.csv` file into the modal.
4. Click `Import`.
5. Review the result summary: total rows, successful rows, failed rows, and skipped rows.
6. If some rows fail, review the error table by row, field, and message.
7. When at least one row imports successfully, the current list reloads automatically.

Frontend validation blocks non-CSV files before upload. Backend validation still remains the source of truth for file size, row limit, enum values, duplicate handling, organization isolation, and relation lookup.

Shared CSV import components live in `src/components/crm/csv-import/`:

- `CsvImportButton`
- `CsvImportModal`
- `ImportResultSummary`
- `ImportErrorTable`

## Web-to-Lead UI

The public consultation form is available at:

- `/dang-ky-tu-van`

It is not inside the dashboard shell and is not protected by the dashboard route guard. `/dashboard` still requires login.

On deploy, `NEXT_PUBLIC_API_BASE_URL` must point to the deployed backend that includes `POST /public/lead-capture`. The public page does not use the dashboard auth interceptor.

Form fields:

- Họ và tên
- Số điện thoại
- Email
- Tên công ty
- Chức vụ
- Website công ty
- Lĩnh vực hoạt động
- Quy mô công ty
- Thời gian muốn được liên hệ
- Nhu cầu tư vấn

Required rules:

- Họ và tên, tên công ty, and nhu cầu tư vấn are required.
- The visitor must enter either email or phone.
- Email is validated on the frontend and backend.

Submit flow:

1. The page calls `POST /public/lead-capture`.
2. While submitting, the Ant Design button shows loading state.
3. On success, the page shows: `Cảm ơn bạn đã đăng ký tư vấn. Chúng tôi sẽ liên hệ lại trong thời gian sớm nhất.`
4. The form resets after a successful submission.
5. Errors are shown as friendly Vietnamese messages.

The submitted consultation need is stored in Lead `description` and appears on the Lead detail page in the `Nhu cầu tư vấn` section, together with company size and preferred contact time when provided.

The hidden `companyFaxHidden` field is a honeypot for simple bot filtering. Real users do not see it.

## Profile and Settings

The profile dropdown in the dashboard header shows:

- Avatar/icon
- User full name
- Email
- Vietnamese role label
- Current organization
- `Cài đặt tài khoản` shortcut to `/dashboard/settings`
- `Đăng xuất`, using the existing logout flow

`/dashboard/settings` contains four cards:

- `Thông tin tổ chức`: organization name, created date, and last updated date.
- `Thông tin tài khoản`: user full name, email, role, and organization.
- `Tích hợp Website`: public Web-to-Lead route `/dang-ky-tu-van`, default source `Website`, default status `Mới`, plus buttons to open the form and copy the full form URL.
- `Đổi mật khẩu`: current password, new password, and confirmation password form.
- `Mẫu công việc`: shortcut to manage follow-up Task templates used by Lead Conversion Wizard.

Change password rules:

- The form calls `PATCH /auth/change-password`.
- The user must be logged in.
- The new password must be at least 8 characters and contain at least one letter and one number.
- The confirmation password must match.
- On success, the app shows a Vietnamese success message, clears the local session, and redirects to `/login`.

## Task Templates After Lead Conversion

Admin users can manage follow-up task templates at:

- `/dashboard/settings/task-templates`

Template structure:

- Template name and description
- Active/default flags
- Groups such as `Ngày đầu` or `Tuần đầu`
- Items with title, description, priority, due-after-days, sort order, and active flag

Usage flow:

1. Admin creates or enables a Task Template and optionally sets it as default.
2. A user opens the Lead Conversion Wizard.
3. The wizard shows `Công việc sau chuyển đổi`.
4. If `Tạo công việc từ mẫu` is enabled, the frontend sends `createTasksFromTemplate` and optional `taskTemplateId` to `POST /leads/:id/convert`.
5. Backend creates follow-up Tasks related to the converted Opportunity.

The old conversion flow still works when no template is selected or the checkbox is off. This feature is web-only in this phase; mobile continues using the existing conversion contract without sending task template fields.

## Task Comments And Attachments UI

Task detail includes a `Trao đổi` tab.

Users can:

- Add a text-only comment.
- Attach up to 5 files per comment.
- Preview image attachments.
- Open or download document attachments through backend-generated signed URLs.

Frontend validation:

- A comment must include text or at least one file.
- Max 5 files.
- Max 5MB per file.
- Supported files: JPEG, PNG, WebP, PDF, Word, Excel, and CSV.

The frontend never talks to Supabase directly and never receives the Supabase service role key. All upload and signed URL work goes through the backend.

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

## Lead Assignment By Area

The web CRM supports area-based Lead assignment under `/dashboard/settings/lead-assignment`.

- Admin can create/update/deactivate rules by `Tỉnh/Thành phố` + `Phường/Xã`.
- Manual Lead create/edit, public Web-to-Lead, and Lead CSV template include `provinceName`, `wardName`, and `addressDetail`.
- Lead detail shows these fields in `Khu vực phụ trách`.
- Sales/Support users only see Leads assigned to themselves; Admin/Manager still see all organization Leads.
- Rule management is web-only. Mobile can read and edit the area fields but does not manage rules.

## Current Limitations & Future TODOs

1. **Token Storage Security**: The MVP still stores access and refresh tokens with `js-cookie`. For production, move refresh tokens to secure `HttpOnly` cookies set by the backend.
2. **Dashboard Date Filtering**: Dashboard analytics use dedicated backend endpoints, but there is no date range filter yet.
3. **Global Search MVP**: Global Search is implemented in the `AppHeader` by querying existing list endpoints in parallel. A backend aggregate search endpoint with ranking/highlighting is still future work.
4. **Recycle Bin Scope**: Recycle Bin is implemented for Leads, Accounts, Contacts, Opportunities, Tasks, and Cases. Users and Notes are soft-deleted by backend behavior but are not part of the current Recycle Bin UI.
5. **Mobile App**: Flutter mobile app is not implemented yet.
