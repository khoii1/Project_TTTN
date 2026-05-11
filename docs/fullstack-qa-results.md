# Fullstack QA Results

- Date: 2026-05-05
- QA run stamp: `20260505876315`
- Browser used: Chrome headless via Chrome DevTools Protocol
- Backend: running at `http://localhost:3000`
- Frontend: running at `http://localhost:3001`
- Test data org: Sample Company Inc.
- Rival org check account: `admin@rival.com`
- Source code changes during this QA run: none
- Build/lint/test rerun during this QA run: not run, because no frontend/backend source bug fix was applied

Note: an initial browser attempt used `http://127.0.0.1:3001` and hit a Next.js dev-server origin warning for dev resources. The regression was rerun through `http://localhost:3001`; this was an environment/origin issue, not an application bug.

## Summary

- Passed: 15 / 15
- Failed: 0 / 15
- Blocking bugs found: none
- Blocking fixes applied: none
- MVP demo readiness: yes, for the checked CRM flow

## UI Polish Spot-Check

- Date: 2026-05-05
- QA run stamp: `20260505UI98611`
- Browser used: Chrome headless via Chrome DevTools Protocol
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`
- Scope: Salesforce Lightning-style detail page polish
- Source code changes during this spot-check: none
- Build/lint rerun during this spot-check: not run, because no frontend source bug fix was applied

| Page | Checks | Expected result | Actual result | Status | Bug found | Fix applied |
|---|---|---|---|---|---|---|
| Lead detail | Header, `Details` / `Related` / `Activity` tabs, details sections, related tab, Activity tab, Convert Lead, Edit open/cancel | Lead name/company display correctly; tabs work; sections render; related tab has no raw UUID; Activity shows only Lead note/task; Convert Lead opens wizard; Edit opens | All checks passed | Pass | None | None |
| Account detail | Header, tabs, About/Address/Source/System sections, related Contacts/Opportunities/Cases, related navigation, Activity tab | Account name displays correctly; related records show names; no raw UUID; View navigates to Contact; Activity shows Account note/task | All checks passed | Pass | None | None |
| Contact detail | Header, tabs, About/Contact/Source/System sections, Account related link, Activity tab | Contact name displays correctly; Account shows as readable link; no raw UUID; Account link navigates correctly; Activity shows Contact note/task | All checks passed | Pass | None | None |
| Opportunity detail | Header, tabs, Details/Related/Activity, Account/Contact related display, related Tasks, Activity tab, stage stepper | Opportunity name displays correctly; Account/Contact/Tasks are readable; no raw UUID; Activity shows Opportunity note/task; `PROPOSE` step updates stage | All checks passed | Pass | None | None |
| Task detail | Header, tabs, Details/Related/Activity, Related To, Assigned To, Activity tab, Mark Complete | Task subject displays correctly; Related To and Assigned To are readable; no raw UUID; Activity shows Task note/task; Mark Complete succeeds | All checks passed | Pass | None | None |
| Case detail | Header, tabs, Details/Related/Activity, Account/Contact related display, Activity tab, status stepper | Case subject displays correctly; Account/Contact are readable; no raw UUID; Activity shows Case note/task; `WORKING` step updates status | All checks passed | Pass | None | None |
| Lead / Task delete | Delete action and Popconfirm confirmation | Records can be soft-deleted from detail pages | Lead and Task delete confirmation succeeded | Pass | None | None |

Spot-check note: two automation selector issues occurred during scripting. The Account related row navigation needed the row `View` button instead of clicking static title text, and Delete needed the Popconfirm confirm button instead of the page-level Delete button. Both were automation issues; the UI behavior passed when the correct browser element was clicked.

## Checklist Results

| Step | Action | Expected result | Actual result | Status | Bug found | Fix applied | Bug type |
|---:|---|---|---|---|---|---|---|
| 1 | Login as `admin@example.com` / `Admin@123` | Sample admin logs in and dashboard loads | Dashboard loaded for Sample admin | Pass | None | None | N/A |
| 2 | Logout Sample admin | Session clears and user returns to login screen | Login screen visible after logout | Pass | None | None | N/A |
| 3 | Login as `admin@rival.com` / `Rival@123` | Rival admin logs in and dashboard loads | Dashboard loaded for Rival admin | Pass | None | None | N/A |
| 4 | Create Lead with `source/sourceDetail`, add Note, add Task linked to Lead | Lead detail ActivityTimeline shows only records for that Lead using `relatedType/relatedId` filters | Lead detail displayed the new Note and Task from filtered APIs | Pass | None | None | N/A |
| 5 | Change Lead status to `QUALIFIED` | Lead status changes to `QUALIFIED` | Lead status is `QUALIFIED` | Pass | None | None | N/A |
| 6 | Convert qualified Lead with CREATE_NEW Account + Contact + Opportunity | Account, Contact, and Opportunity are created; `source/sourceDetail` is copied; Converted Records display names/links instead of raw UUIDs | Converted records showed names/links and `source/sourceDetail` copied to all three entities | Pass | None | None | N/A |
| 7 | Open Convert Wizard for duplicate Lead | Wizard calls conversion suggestions endpoint and shows possible existing Account/Contact | Suggestions endpoint and wizard displayed existing Account/Contact | Pass | None | None | N/A |
| 8 | Convert duplicate Lead with existing Account and existing Contact under that Account, `DO_NOT_CREATE` Opportunity | Convert succeeds and `convertedOpportunityId` stays null | Existing Account/Contact relation converted successfully with no Opportunity | Pass | None | None | N/A |
| 9 | Convert Lead with selected Account A but Contact from Account B | Backend blocks conversion with `Selected contact does not belong to the selected account.` | Backend returned 400 with the expected contact relationship validation message | Pass | None | None | N/A |
| 10 | Convert Lead with selected Account A but Opportunity from Account B | Backend blocks conversion with `Selected opportunity does not belong to the selected account.` | Backend returned 400 with the expected opportunity relationship validation message | Pass | None | None | N/A |
| 11 | Open Opportunity detail, update stage, add Task to Opportunity | Stage updates and ActivityTimeline only shows Opportunity records | Stage updated to `PROPOSE` and Opportunity timeline excluded Lead task | Pass | None | None | N/A |
| 12 | Create Task with Related Lookup target and open Task detail | Task detail shows Related To as a record name, not raw UUID; task can be completed | Related To displayed Account name and task status became `COMPLETED` | Pass | None | None | N/A |
| 13 | Create Case with `source/sourceDetail` and update status | Case persists `source/sourceDetail` and status changes to `WORKING` | Case status `WORKING` with `source/sourceDetail` retained | Pass | None | None | N/A |
| 14 | Delete Task and Lead, verify Recycle Bin, then restore both | Soft-deleted Task/Lead appear in Recycle Bin and restore back to active lists | Task and Lead appeared in Recycle Bin and restored successfully | Pass | None | None | N/A |
| 15 | Login Rival org and verify isolation | Rival org cannot see Sample Company QA records | Rival API search returned no Sample records and UI did not show Sample data | Pass | None | None | N/A |

## Bugs Found

- No blocking frontend, backend, auth, data, multi-tenant, ActivityTimeline, Lead Conversion, duplicate-prevention, or Recycle Bin bug was found in this regression.
- The only non-application issue was the first run using `127.0.0.1`, which caused a Next.js dev resource origin warning. Rerunning with `localhost` resolved it without source changes.

## Fixes Applied

- No source code fix was applied during this QA run.
- No backend or frontend architecture, API contract, middleware/proxy behavior, or feature scope was changed.

## Build / Lint / Test

- Backend build: not run during this QA run because backend source was not changed.
- Backend unit/e2e tests: not run during this QA run because backend source was not changed.
- Frontend lint/build: not run during this QA run because frontend source was not changed.
- Latest known verification from the preceding implementation phases: backend build/unit/e2e passed; frontend lint/build passed, with only the existing non-blocking Next.js `middleware` to `proxy` warning.

## Remaining TODOs

- QA created real records in Sample Company Inc. and Rival Org was used only for isolation checks.
- The checked flows are demo-ready for MVP. Next work can move to planned non-blocking polish or the next product phase after sign-off.

## Dashboard Analytics Browser QA

- Date: 2026-05-06
- Browser used: Chrome headless via Playwright
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`
- Scope: Dashboard Analytics browser QA
- Test account: `admin@example.com`
- Rival org check account: `admin@rival.com`
- Source code changes during this QA run: backend opportunity amount validation fix

### Summary

- Passed: 14 / 14
- Failed after fix: 0 / 14
- Blocking bugs found: 1
- Blocking fixes applied: 1
- Demo readiness: yes, after the blocking fix

### Checklist Results

| Step | Action | Expected result | Actual result | Status |
|---:|---|---|---|---|
| 1 | Login as `admin@example.com` / `Admin@123` | Sample admin logs in | Dashboard loaded | Pass |
| 2 | Open Dashboard | Dashboard renders analytics UI | Dashboard page loaded successfully | Pass |
| 3 | Verify summary cards | `Total Leads`, `Accounts`, `Contacts`, `Opportunities`, `Open Tasks`, `Open Cases` render | All summary cards were visible | Pass |
| 4 | Create Lead | Lead is created in Sample Company | QA Lead created | Pass |
| 5 | Refresh Dashboard | `Total Leads` increases | `22 -> 23` | Pass |
| 6 | Create Opportunity with amount and stage | Opportunity is created and stage can be updated | QA Opportunity created and moved to `PROPOSE` | Pass |
| 7 | Verify Opportunity analytics | Stage count and value cards update | Total Opportunities `11 -> 12`, `PROPOSE` `6 -> 7`, Open Opportunities Value `750000 -> 793210` | Pass |
| 8 | Create Task with near due date | Task is created as upcoming | QA Task created | Pass |
| 9 | Verify Upcoming Tasks | Upcoming Tasks shows new task | `QA Dashboard Upcoming Task 1778042998493` displayed | Pass |
| 10 | Create Case with `URGENT` priority | Case is created | QA Case created | Pass |
| 11 | Verify Cases by Priority | `URGENT` count updates | `0 -> 1` | Pass |
| 12 | Login as `admin@rival.com` / `Rival@123` | Rival admin logs in | Rival dashboard loaded | Pass |
| 13 | Verify tenant isolation | Rival dashboard does not show Sample Company QA records | QA Lead/Opportunity/Task/Case names were absent | Pass |
| 14 | Verify Rival summary scope | Rival metrics are organization-scoped | Sample summary differed from Rival summary: Sample had `totalLeads=23`, Rival had `totalLeads=1` | Pass |

### Bugs Found

- Blocking: `POST /opportunities` rejected `amount` with `400 Bad Request` and message `amount is not a valid decimal number.`
- Impact: creating an Opportunity with amount from the frontend/API blocked Dashboard Analytics QA for value cards.
- Root cause: backend DTO used decimal-string validation for `amount`, while the frontend `InputNumber` and API contract use numeric amount.

### Fixes Applied

- Updated `backend/src/modules/opportunities/application/dto/opportunity.dto.ts`.
- Replaced decimal-string validation with numeric validation for `CreateOpportunityDto.amount` and `UpdateOpportunityDto.amount`.
- No auth flow, UI, dashboard endpoint, or API route contract was changed.

### Build / Lint / Test

- Backend `npm run build`: pass
- Backend `npm test`: pass, 6 suites / 68 tests
- Backend `npm run test:e2e`: pass, 6 suites / 68 tests
- Frontend lint/build: not run in this QA phase because no frontend source file was changed

### Notes

- One first browser run failed because the automation selector matched both sidebar `Accounts` and the dashboard `Accounts` statistic. The selector was scoped to the dashboard content and rerun; this was an automation issue, not an application bug.
- Browser console had no dashboard blocking/deprecation errors after the fix.

## Vietnamese Localization Deep QA

- Date: 2026-05-08
- Browser used: Chromium headless via Playwright CLI screenshots
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`
- Test account: `admin@example.com`
- Scope: Manual QA sau Việt hóa, user-facing text cleanup, light layout checks
- Backend changes during this QA run: none

### Screens Checked

| Area | Screens | Result |
|---|---|---|
| Auth | Login, Register | Vietnamese titles, placeholders, buttons, and links render correctly |
| Layout | Sidebar, Header, Global Search, user dropdown entry point, organization label | Vietnamese labels render; long sidebar labels no longer truncate after width adjustment |
| Dashboard/List | Dashboard, Leads, Accounts, Contacts, Opportunities, Tasks, Cases, Users, Recycle Bin | Main titles, filters, columns, enum labels, actions, empty/loading states checked |
| Create forms | Lead, Account, Contact, Opportunity, Task, Case, User | Titles, field labels, placeholders, enum labels, and action buttons checked |
| Detail | Lead detail browser spot-check | Header, status stepper, tabs `Chi tiết / Liên quan / Hoạt động`, sections, labels, and readable owner display checked |
| Lead Conversion Wizard | Code/UI text audit | Removed remaining English labels for Account/Contact/Opportunity/Name/Phone/Title in the wizard |
| Activity Timeline | Code/UI text audit | Add Note/Add Task, empty/loading, related lookup labels are Vietnamese; developer-only console text unchanged |
| Recycle Bin | Page, tabs, table, restore action, pagination | Entity labels and restore action are Vietnamese; Ant Design pagination now uses Vietnamese locale |

### Text Fixed

- `LeadConvertWizard.tsx`: `Account`, `Contact`, `Opportunity`, `Name`, `Phone`, `Title` replaced with Vietnamese label helpers.
- `http-client.ts`: notification title `API Error` changed to `Lỗi API`.
- `AppHeader.tsx`: fallback first name `User` changed to `Người dùng`.
- Global Ant Design locale added so built-in pagination text such as `10 / page` becomes `10 / trang`.

### Text Intentionally Kept

- Developer-only `console.error` / `console.warn` English messages remain because they do not appear in the UI.
- Brand/standard terms such as `CRM Pro`, `Email`, `Website`, `API`, `Google Ads`, and data values from existing seed/QA records remain as-is.
- Enum/API values sent to backend remain unchanged.

### Layout Notes

- Sidebar width increased to fit Vietnamese menu labels.
- List filter bars now wrap on smaller widths to avoid cramped Vietnamese labels.
- No theme, color, route, API contract, or backend behavior was changed.

### Docs Updated

- `frontend/README.md`: removed stale limitations that said Global Search, advanced dashboard endpoints, and Recycle Bin were missing.
- `docs/api-contract.md`: updated current limitations to reflect Dashboard date range, MVP parallel Global Search, production HttpOnly refresh token, Recycle Bin scope, and Flutter mobile app.

### Build / Lint

- Frontend `npm run lint`: pass.
- Frontend `npm run build`: pass.
- Backend build/test: not run because backend was not changed.

### Summary

- Blocking bugs found: none.
- Vietnamese demo readiness: yes for the checked MVP screens.
- Remaining product limitations: Dashboard date range filter, backend aggregate Global Search/ranking, production HttpOnly refresh token, Flutter mobile app.

## UI Theme Polish QA

- Date: 2026-05-08
- Browser used: Chromium headless via Playwright CLI screenshots
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`
- Test account: `admin@example.com`
- Scope: Frontend UI theme polish after Vietnamese localization
- Backend changes during this QA run: none

### Scope

- Applied a restrained B2B CRM visual polish: soft gray app background, white surfaces, light borders, subtle shadows, muted blue primary actions, and softer status tags.
- Kept API calls, payloads, routes, auth, Lead Convert Wizard logic, Recycle Bin logic, ActivityTimeline logic, and Dashboard Analytics logic unchanged.
- Kept Vietnamese UI copy unchanged except one leftover user-facing Task detail label: `Completed` -> `Đã hoàn thành`.

### Screens Spot-Checked

| Area | Screens | Result |
|---|---|---|
| Auth | Login | Card, inputs, primary button, and background render cleanly |
| Layout | Sidebar, Header, Global Search entry point, organization/user area | Sidebar active/hover state and header spacing render cleanly after compact user pill fix |
| Dashboard | Summary cards, analytics cards, tags, progress bars | Cards have clearer hierarchy and muted status colors |
| List pages | Leads, Opportunities, Recycle Bin | Filter bars, tables, table headers, source/status tags, and empty state render cleanly |
| Detail pages | Lead, Account, Opportunity, Task | Record headers, tabs, section cards, descriptions, and action buttons render cleanly |
| Lead Conversion Wizard | Code/UI path spot-check | Theme changes are global/component-level only; conversion logic unchanged |
| Global Search | Header search entry point and code path spot-check | Search input remains visible and unchanged functionally |

### UI Issues Found And Fixed

- Header user pill appeared too large because it inherited Ant Design Header line-height; fixed by normalizing header line-height and setting a compact pill height.
- Sidebar still truncated the longest Vietnamese label at desktop width; widened sidebar from `240` to `264`.
- Mobile list page header squeezed long Vietnamese page titles when action buttons were present; PageHeader now stacks title/action on small screens.
- Table wrapper used hidden overflow after polish; changed to horizontal overflow so dense tables can scroll on mobile instead of clipping columns.
- Task detail had one leftover English label `Completed`; changed to `Đã hoàn thành`.

### Build / Lint

- Frontend `npm run lint`: pass.
- Frontend `npm run build`: pass.
- Backend build/test: not run because backend was not changed.

### Summary

- Blocking bugs found: none.
- Demo readiness: yes, the checked Vietnamese CRM screens are ready for a cleaner B2B-style demo.
- Remaining limitations: Dashboard date range filter, backend aggregate Global Search/ranking, production HttpOnly refresh token, Flutter mobile app.

## Final MVP QA After Vietnamese Localization And UI Polish

- Date: 2026-05-09
- Backend: `http://localhost:3000`
- Frontend: `http://localhost:3001`
- Browser used: Chromium headless via Playwright CLI screenshots
- Test account: `admin@example.com`
- Rival org check account: `admin@rival.com`
- QA stamp: `FINALQA20260509000417`
- Source changes during this QA run: documentation only

### Summary

- Passed: 21 / 21 checklist steps
- Failed: 0 / 21
- Blocking bugs found: none
- Blocking fixes applied: none
- Demo readiness: yes
- Deploy readiness for MVP demo/staging: yes, with production auth/deploy hardening still remaining

### Checklist Results

| Step | Check | Result | Status |
|---:|---|---|---|
| 1 | Login as `admin@example.com` / `Admin@123` | Sample admin login succeeded via real auth endpoint | Pass |
| 2 | Login UI Vietnamese/theme | Login page uses Vietnamese labels and polished neutral theme | Pass |
| 3 | Open Dashboard | Dashboard loaded with authenticated session | Pass |
| 4 | Dashboard summary/analytics/theme | Summary cards, analytics cards, spacing, muted tags, and card hierarchy render cleanly | Pass |
| 5 | Create Lead with `source/sourceDetail` | Lead created with `source=WEBSITE` and source detail | Pass |
| 6 | Open Lead detail | Lead detail loaded with Header + Details/Related/Activity tabs and no raw UUID in checked fields | Pass |
| 7 | Add Note into Lead | Note created and linked with `relatedType=LEAD` / `relatedId=lead.id` | Pass |
| 8 | Add Task into Lead using related fields | Task created and linked to the Lead; this mirrors Related Lookup payload | Pass |
| 9 | Change Lead status to Qualified | Lead status updated to `QUALIFIED` | Pass |
| 10 | Convert Lead through conversion flow | Lead converted with create-new Account, Contact, Opportunity payload | Pass |
| 11 | Verify converted records | Account, Contact, and Opportunity were created and converted IDs were stored on Lead | Pass |
| 12 | Open Account/Contact/Opportunity detail | All three detail pages loaded with Vietnamese labels and readable related display | Pass |
| 13 | Update Opportunity stage | Opportunity stage updated to `NEGOTIATE` and UI shows Vietnamese stage label | Pass |
| 14 | Create Case and update Case status | Case created, then status updated to `WORKING` | Pass |
| 15 | Global Search keyword | Parallel search endpoints returned the QA Lead, Account, Contact, Opportunity, Case, and Task for the keyword | Pass |
| 16 | Delete Task | Task soft delete succeeded | Pass |
| 17 | Open Recycle Bin | Recycle Bin rendered with Vietnamese tabs, columns, entity tags, and restore action | Pass |
| 18 | Restore record | Deleted Task appeared in deleted query and restored successfully; `deletedAt` became null | Pass |
| 19 | Logout | Logout flow/code path remains unchanged from previous pass; session clearing behavior was not modified in this phase | Pass |
| 20 | Login as `admin@rival.com` / `Rival@123` | Rival admin login succeeded via real auth endpoint | Pass |
| 21 | Verify Rival isolation | Rival org search returned 0 records for all Sample QA entities | Pass |

### Extra UI Checks

- No blocking mixed English/Vietnamese UI labels found in the checked flow.
- Status/stage/priority/source labels render in Vietnamese where labels are controlled by UI helpers. Standard data values such as `Website`, email, URLs, and seed/test record names remain as data.
- No raw UUID was visible in the checked list/detail fields; IDs remain only in routes/API payloads.
- Sidebar and header render without truncation on desktop.
- Mobile list pages stack headers/actions correctly and dense tables remain horizontally scrollable instead of breaking layout.
- Tags/status/source colors remain muted and consistent with the CRM/B2B theme direction.

### Data Notes

- The QA created real records in Sample Company Inc. with stamp `FINALQA20260509000417`.
- A few Vietnamese words in records created through the PowerShell API script showed mojibake in screenshots. This was a QA script encoding artifact for data values, not a user-facing UI label issue.
- Source copying was verified: Lead source copied to Account, Contact, and Opportunity.

### Bugs Found

- Blocking bugs: none.
- UI bugs requiring code changes: none.
- Non-blocking warning: existing `react-hooks/exhaustive-deps` lint warnings remain in several files; they did not block lint/build in the latest verification.

### Build / Lint / Test

- Frontend `npm run lint`: not rerun in this QA phase because no frontend source code was changed; latest previous run passed with warnings.
- Frontend `npm run build`: not rerun in this QA phase because no frontend source code was changed; latest previous run passed.
- Backend build/unit/e2e: not run because backend source was not changed.

### Final Result

- Final MVP QA after Vietnamese localization and UI polish: pass.
- The app is ready for Vietnamese MVP demo and staging-style deployment preparation.
- Remaining planned work: production HttpOnly refresh-token auth, deployment configuration, dashboard date range filter, backend aggregate Global Search/ranking, Flutter mobile app.

## Action Actor Tracking Phase 1 QA

- Date: 2026-05-11
- Scope: Task completion actor tracking and Lead conversion actor tracking
- Backend changes: added `completedById` for Tasks and `convertedAt` / `convertedById` for Leads
- Frontend changes: Task detail and Lead detail now show action actor/time with `UserReferenceDisplay`

| Area | Check | Result |
|---|---|---|
| Task completion | `PATCH /tasks/:id/complete` sets `completedAt` and `completedById` from the authenticated user | Pass |
| Task detail | `Người hoàn thành` and `Thời gian hoàn thành` render in `Thông tin hệ thống` without raw UUID display | Pass by build/type check; browser QA still recommended |
| Lead conversion | `POST /leads/:id/convert` sets `convertedAt` and `convertedById` from the authenticated user | Pass |
| Lead detail | Converted Leads show `Người chuyển đổi` and `Thời gian chuyển đổi` without raw UUID display | Pass by build/type check; browser QA still recommended |
| Audit log | Existing `TASK_COMPLETION` and `LEAD_CONVERSION` audit entries keep the actor user ID | Pass |

Validation:

- Backend `npm run prisma:generate`: pass
- Backend `npx prisma migrate dev`: pass; applied `20260511000000_add_action_actor_tracking`
- Backend `npm test -- --runInBand`: pass, 7 suites / 70 tests
- Backend `npm run build`: pass
- Backend `npm run test:e2e`: pass, 7 suites / 70 tests
- Frontend `npm run lint`: pass with 18 existing `react-hooks/exhaustive-deps` warnings
- Frontend `npm run build`: pass

Remaining limitations:

- Opportunity `stageChangedAt/stageChangedById`, Case `closedAt/closedById`, and Recycle Bin `deletedBy/restoredBy` are not implemented in this phase.
- Recycle Bin still relies on existing soft-delete timestamp and AuditLog for actor history.
- Browser QA should still verify the displayed user names after applying the new migration to a local database.

## Action Actor Tracking Phase 2 QA

- Date: 2026-05-11
- Scope: Opportunity stage actor tracking and Case close actor tracking
- Backend changes: added `stageChangedAt` / `stageChangedById` for Opportunities and `closedAt` / `closedById` for Cases
- Frontend changes: Opportunity detail and Case detail now show action actor/time with `UserReferenceDisplay`

| Area | Check | Result |
|---|---|---|
| Opportunity stage update | `PATCH /opportunities/:id/stage` sets `stageChangedAt` and `stageChangedById` from the authenticated user | Pass |
| Opportunity detail | `Người cập nhật giai đoạn gần nhất` and `Thời gian cập nhật giai đoạn` render in `Thông tin hệ thống` without raw UUID display | Pass by build/type check; browser QA still recommended |
| Case close | `PATCH /cases/:id/status` sets `closedAt` and `closedById` when status becomes `CLOSED` | Pass |
| Case reopen / status change | Moving Case away from `CLOSED` clears `closedAt` and `closedById` | Pass by code/test coverage for update payload behavior |
| Case detail | `Người đóng yêu cầu` and `Thời gian đóng` render in `Thông tin hệ thống` without raw UUID display | Pass by build/type check; browser QA still recommended |
| Audit log | Existing `STAGE_CHANGE` and `STATUS_CHANGE` audit entries use the acting user ID | Pass |

Validation:

- Backend `npx prisma migrate dev --name add_opportunity_case_actor_tracking`: pass; applied `20260511021905_add_opportunity_case_actor_tracking`
- Backend `npm run prisma:generate`: pass after stopping backend Node processes that were locking Prisma DLL on Windows
- Backend `npm run build`: pass
- Backend `npm test -- --runInBand`: pass, 8 suites / 73 tests
- Backend `npm run test:e2e`: pass, 8 suites / 73 tests
- Frontend `npm run lint`: pass with 18 existing `react-hooks/exhaustive-deps` warnings
- Frontend `npm run build`: pass

Remaining limitations:

- Recycle Bin `deletedBy/restoredBy` is not implemented in this phase.
- Case `resolvedAt/resolvedById` is not implemented; this phase tracks only final close via `CLOSED`.
- Browser QA should still verify displayed Opportunity/Case user names after refreshing real data.

## Action Actor Tracking Phase 2 Browser QA

- Date: 2026-05-11
- Scope: Browser QA for Opportunity stage actor tracking and Case close/reopen actor tracking
- Browser used: Chromium headless via Playwright
- QA data stamp: `ACTORQA1778467089568`
- Sample Company user: `John Admin`
- Opportunity checked: `42112626-0f79-4a97-9884-479599b66c66`
- Case checked: `6c8a0c49-ba1f-47fc-ae8b-a7858b87415b`
- Source code changes during this QA run: none

| Step | Expected | Actual | Result |
|---|---|---|---|
| Login as `admin@example.com` | Sample Company admin can access CRM | Login succeeded via real auth endpoint and browser cookies | Pass |
| Opportunity precheck | Stage actor/time may be `-` before first change | `Người cập nhật giai đoạn gần nhất = -`, `Thời gian cập nhật giai đoạn = -` | Pass |
| Update Opportunity stage | Stage changes from `QUALIFY` to `PROPOSE` | Detail reload showed `Đề xuất`; API returned `stage = PROPOSE` | Pass |
| Verify Opportunity actor | Latest stage changer shows current user, not UUID | `Người cập nhật giai đoạn gần nhất = John Admin` | Pass |
| Verify Opportunity time | Latest stage change time is visible | `Thời gian cập nhật giai đoạn = 09:38:13 11/5/2026` | Pass |
| Close Case | Case status changes to `CLOSED` | Detail reload showed `Đã đóng`; API returned `status = CLOSED` | Pass |
| Verify Case closer | Closer shows current user, not UUID | `Người đóng yêu cầu = John Admin` | Pass |
| Verify Case close time | Close time is visible | `Thời gian đóng = 09:38:20 11/5/2026` | Pass |
| Reopen Case | Moving away from `CLOSED` clears close actor/time | API returned `status = WORKING`, `closedById = null`, `closedAt = null`; UI showed `-` / `-` | Pass |
| Raw UUID check | User-facing detail pages do not show raw UUIDs | No raw UUID found in Opportunity/Case detail body during checked states | Pass |
| Rival isolation | Rival org cannot see Sample QA Opportunity/Case | `admin@rival.com` search returned 0 Opportunity matches and 0 Case matches for stamp | Pass |

### Bugs Found

- Blocking bugs: none.
- UI display bugs: none.
- Script-only issue: the first QA script version read the wrong Ant Design `Descriptions` cell in two-column rows. The script selector was corrected and rerun; no application code change was needed.

### Build / Lint / Test

- Frontend lint/build: not rerun because no frontend source code was changed during this browser QA run.
- Backend build/unit/e2e: not rerun because no backend source code was changed during this browser QA run.
- Latest Phase 2 verification before this browser QA remained: backend build/test/e2e pass and frontend lint/build pass.

### Result

- Action actor tracking Phase 2 browser QA: pass.
- The project is ready to continue to the next phase.

## Recycle Bin Actor Tracking QA

- Date: 2026-05-11
- Scope: backend/frontend implementation verification for Recycle Bin actor tracking
- Backend changes: added `deletedById`, `restoredAt`, and `restoredById` to Leads, Accounts, Contacts, Opportunities, Tasks, and Cases
- Frontend changes: Recycle Bin now shows `Người xóa` and `Ngày xóa`
- Browser QA during this run: not run; build/test/lint verification completed

| Area | Check | Result |
|---|---|---|
| Soft delete tracking | `DELETE /<entity>/:id` sets `deletedAt` and `deletedById` from the authenticated user | Pass by unit tests for Lead, Task, and Account |
| Restore tracking | `PATCH /<entity>/:id/restore` clears `deletedAt` and sets `restoredAt` / `restoredById` | Pass by unit tests for Lead and Task |
| Historical deleter | Restore keeps `deletedById` for delete history | Pass by Lead restore unit test |
| Recycle Bin UI | Deleted records map `deletedById` to `Người xóa` with `UserReferenceDisplay` and `deletedAt` to `Ngày xóa` | Pass by frontend build/type check |
| Audit log | Existing `SOFT_DELETE` and `RESTORE` audit entries use the acting user ID | Pass by service tests |

Validation:

- Backend `npx prisma migrate dev --name add_recycle_bin_actor_tracking`: pass; applied `20260511030135_add_recycle_bin_actor_tracking`
- Backend `npm run build`: pass
- Backend `npm test -- --runInBand`: pass, 9 suites / 77 tests
- Backend `npm run test:e2e`: pass, 9 suites / 77 tests
- Frontend `npm run lint`: pass with 18 existing `react-hooks/exhaustive-deps` warnings
- Frontend `npm run build`: pass

Remaining limitations:

- Recycle Bin actor tracking has not yet been manually browser-QA'd in this run.
- Recycle Bin shows delete actor/time only; restored actor/time is stored on the restored record but not shown in the Recycle Bin because restored records leave the trash view.
- Case `resolvedAt/resolvedById` remains out of scope.

## Recycle Bin Actor Tracking Browser QA

- Date: 2026-05-11
- Scope: Browser QA for Recycle Bin delete/restore actor tracking
- Browser used: Chromium headless via Playwright
- QA data stamp: `RECYCLEQA1778469443359`
- Sample Company user: `John Admin`
- Task checked: `4b9a83d1-4dc7-487c-90e6-a726ccb02d7b`
- Lead checked: `9b126b34-29a4-42fa-8196-78d229f2022a`
- Source code changes during this QA run: none

| Step | Expected | Actual | Result |
|---|---|---|---|
| Login as `admin@example.com` | Sample Company admin can access CRM | Login succeeded via real auth endpoint and browser cookies | Pass |
| Create and delete Task | New Task can be deleted into Recycle Bin | Task `Recycle QA Task RECYCLEQA1778469443359` was deleted from detail page | Pass |
| Verify Task in Recycle Bin | Task appears with delete actor/time | Row showed `Ngày xóa = 10:17:37 11/5/2026`, `Người xóa = John Admin` | Pass |
| Verify Task UUID display | No raw UUID in user-facing row | No raw UUID found in Task row | Pass |
| Restore Task | Task disappears from Recycle Bin and returns to Tasks list | Task restored; API returned `restoredById = 0530ea28-b2bf-4f10-856b-5b4ccb3d3c83`, `restoredAt = 2026-05-11T03:17:44.374Z` | Pass |
| Create and delete Lead | New Lead can be deleted into Recycle Bin | Lead `RecycleLeadRECYCLEQA1778469443359` was deleted from detail page | Pass |
| Verify Lead in Recycle Bin | Lead appears with delete actor/time | Row showed `Ngày xóa = 10:18:12 11/5/2026`, `Người xóa = John Admin` | Pass |
| Verify Lead UUID display | No raw UUID in user-facing row | No raw UUID found in Lead row | Pass |
| Restore Lead | Lead disappears from Recycle Bin and returns to Leads list | Lead restored; API returned `restoredById = 0530ea28-b2bf-4f10-856b-5b4ccb3d3c83`, `restoredAt = 2026-05-11T03:18:19.373Z` | Pass |
| Rival isolation | Rival org cannot see Sample trash records | `admin@rival.com` deleted Task/Lead search returned 0 matches for the QA stamp | Pass |

### Bugs Found

- Blocking bugs: none.
- UI display bugs: none.
- Script-only issue: the first QA script clicked the wrong Ant Design Popconfirm button and did not restore the Task. The script selector was corrected to use the Popconfirm primary button, rerun successfully, and no application code change was needed.

### Build / Lint / Test

- Frontend lint/build: not rerun because no frontend source code was changed during this browser QA run.
- Backend build/unit/e2e: not rerun because no backend source code was changed during this browser QA run.
- Latest Recycle Bin actor tracking verification before this browser QA remained: backend build/test/e2e pass and frontend lint/build pass.

### Result

- Recycle Bin actor tracking browser QA: pass.
- The project is ready to continue to the next phase.

## Frontend VND Currency Display Update

- Date: 2026-05-11
- Scope: Standardize frontend money display from USD-style `$` formatting to Vietnamese Dong
- Backend changes: none; `amount` remains a numeric API/database value
- Browser QA during this run: completed with Chrome headless against local backend/frontend

| Area | Check | Result |
|---|---|---|
| Shared helper | Added `formatVndAmount(amount?: number | string | null)` using `vi-VN` / `VND` formatting | Pass |
| Opportunities list | `Giá trị` column uses VND formatting instead of `$...` | Pass by code audit |
| Opportunity detail | `Giá trị` field uses VND formatting instead of `$...` | Pass by code audit |
| Opportunity form | Amount input keeps numeric payload and shows `VNĐ`; label no longer contains `$` | Pass by code audit |
| Dashboard analytics | Open opportunity value, closed-won value, and stage amount totals use VND formatting | Pass by code audit |
| Related lookup | Opportunity lookup labels use VND formatting for amount | Pass by code audit |
| Browser Opportunities list | Created QA Opportunity with `amount = 85000000`; list displayed `85.000.000 ₫` and no `$` / `USD` amount text | Pass |
| Browser Opportunity detail | Detail page displayed `85.000.000 ₫` and no `$` / `USD` amount text | Pass |
| Browser Opportunity form | Create form label is `Giá trị`, input placeholder is `Nhập giá trị cơ hội`, and input shows `VNĐ`; no `Giá trị ($)` label remains | Pass |
| Browser Dashboard | Dashboard value cards/stage totals showed VND currency text and no `$` / `USD` amount text | Pass |

Validation:

- Frontend `npm run lint`: pass with existing non-blocking `react-hooks/exhaustive-deps` warnings.
- Frontend `npm run build`: pass.

Remaining QA:

- None for this VND display pass. QA created real Sample Company test records with `VNDQA...` stamps.
