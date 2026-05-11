# Full-Stack QA Checklist

Use this checklist to validate the end-to-end CRM flow after backend/frontend contract changes.

## Environment

- [ ] Backend running
- [ ] Frontend running
- [ ] Seed data available
- [ ] Logged in with a seeded test user

## Main Flow

- [ ] Login as `admin@example.com` / `Admin@123`
- [ ] Open dashboard
- [ ] Create Lead
- [ ] Add Note to Lead
- [ ] Add Task to Lead
- [ ] Reload Lead detail and verify Activity Timeline shows only that Lead's task/note
- [ ] Open a different Opportunity detail and verify the Lead's task/note do not appear there
- [ ] Change Lead Status
- [ ] Convert Lead
- [ ] Verify Account created
- [ ] Verify Contact created
- [ ] Verify Opportunity created
- [ ] Open Account detail and verify related Contacts / Opportunities
- [ ] Open Account detail and verify Related Contacts load correctly from backend `accountId` filter
- [ ] Open Account detail and verify Related Opportunities load correctly from backend `accountId` filter
- [ ] Open Account detail and verify Related Cases load correctly from backend `accountId` filter
- [ ] Open Contact detail and verify Related Opportunities load correctly from backend `contactId` filter
- [ ] Open Contact detail and verify Related Cases load correctly from backend `contactId` filter
- [ ] Verify related lists show readable names/status labels and no raw UUIDs
- [ ] Open Opportunity detail and update stage
- [ ] Create Task for Opportunity
- [ ] Create Task, select Related Type = Opportunity, search Opportunity by name, select Opportunity, submit, and verify `relatedId` is saved correctly
- [ ] Open Task detail, verify Related To shows the related record name instead of UUID, then click it and verify navigation to the related detail page
- [ ] Open Task detail edit mode and verify Related To is not editable because the current backend does not support updating task relation fields
- [ ] Complete Task
- [ ] Create Task, delete Task, verify it disappears from Active list, open Deleted tab, restore Task, and verify it returns to Active list
- [ ] Create Case
- [ ] Update Case Status
- [ ] Logout
- [ ] Verify Logout calls backend `/auth/logout`, clears local session, and redirects to `/login`
- [ ] After Logout, open `/dashboard` directly and verify it redirects to `/login`
- [ ] Optional API check: try using the old refresh token after Logout and verify refresh fails
- [ ] Login as `admin@rival.com` / `Rival@123`
- [ ] Verify Rival Org cannot see Sample Company data

## Expected Results

- [ ] Auth redirects work for protected routes
- [ ] CRUD screens load without API contract errors
- [ ] Pagination uses backend `data/meta` responses
- [ ] Organization isolation is preserved across all modules
- [ ] No password, refresh token hash, or deleted records are exposed in UI responses

## Recycle Bin QA

- [ ] Create Task
- [ ] Delete Task
- [ ] Open Recycle Bin
- [ ] Verify Task appears in Recycle Bin
- [ ] Verify Task shows `Người xóa` as the deleting user name, not a UUID
- [ ] Verify Task shows `Ngày xóa` with the deletion timestamp
- [ ] Restore Task
- [ ] Verify Task disappears from Recycle Bin
- [ ] Verify Task appears again in Tasks list
- [ ] Create Lead
- [ ] Delete Lead
- [ ] Open Recycle Bin
- [ ] Verify Lead appears in Recycle Bin
- [ ] Verify Lead shows `Người xóa` as the deleting user name, not a UUID
- [ ] Verify Lead shows `Ngày xóa` with the deletion timestamp
- [ ] Restore Lead
- [ ] Verify Lead disappears from Recycle Bin
- [ ] Verify Lead appears again in Leads list
- [ ] Optionally repeat delete/restore actor tracking with Account, Contact, Opportunity, or Case

## Source QA

- [ ] Create Lead with Source = Facebook
- [ ] Convert Lead
- [ ] Verify Account source = Facebook
- [ ] Verify Contact source = Facebook
- [ ] Verify Opportunity source = Facebook
- [ ] Create Case with Source = Email
- [ ] Verify Case detail shows Source = Email
- [ ] Create Lead with Source = Website
- [ ] Open Leads list
- [ ] Filter Source = Facebook
- [ ] Verify only Facebook leads are shown
- [ ] Clear Source filter
- [ ] Verify all sources are shown again
- [ ] Open Accounts or Opportunities list
- [ ] Filter Source and verify the list uses the selected source filter correctly

## Global Search QA

- [ ] Create Lead, Account, and Contact with a shared keyword
- [ ] Type the keyword into Global Search in the header
- [ ] Verify results appear grouped by entity
- [ ] Click a Lead result and verify it navigates to the Lead detail page
- [ ] Click an Account result and verify it navigates to the Account detail page
- [ ] Search for a keyword that does not exist and verify `No results found`

## Dashboard Analytics QA

- [ ] Login as admin
- [ ] Open Dashboard
- [ ] Verify summary cards load for Leads, Accounts, Contacts, Opportunities, Open Tasks, and Open Cases
- [ ] Create a Lead
- [ ] Refresh Dashboard and verify Total Leads increases
- [ ] Create an Opportunity with amount, for example `85000000`
- [ ] Refresh Dashboard and verify Opportunities by Stage and value metrics update
- [ ] Verify Dashboard amount cards and Opportunity stage amounts display VND, for example `85.000.000 ₫`, with no `$` symbol
- [ ] Create a Task due soon
- [ ] Refresh Dashboard and verify Upcoming Tasks shows the task
- [ ] Verify dashboard analytics do not show raw UUIDs

## Currency Display QA

- [ ] Open Opportunities list
- [ ] Verify the `Giá trị` column displays VND/VNĐ formatting, for example `85.000.000 ₫`
- [ ] Open Opportunity detail
- [ ] Verify the `Giá trị` field displays VND/VNĐ formatting
- [ ] Create or edit an Opportunity and verify the amount input label is `Giá trị`, the placeholder is Vietnamese, and the input shows `VNĐ`
- [ ] Open Dashboard
- [ ] Verify all opportunity value metrics display VND/VNĐ and no user-facing amount display uses USD or `$`

## Vietnamese UI QA

- [ ] Open Login and Register pages and verify titles, form labels, validation messages, and buttons display Vietnamese
- [ ] Login and verify Sidebar, AppHeader, user menu, and Global Search display Vietnamese
- [ ] Open Dashboard and verify summary cards, analytics sections, statuses, stages, priorities, empty/loading/error states display Vietnamese
- [ ] Open Leads, Accounts, Contacts, Opportunities, Tasks, Cases, Users, and Recycle Bin list pages
- [ ] Verify page titles, create buttons, search placeholders, filters, table columns, action confirmations, and toast messages display Vietnamese
- [ ] Open Lead, Account, Contact, Opportunity, Task, and Case detail pages
- [ ] Verify tabs, section titles, field labels, action buttons, related records, Activity Timeline, and enum labels display Vietnamese
- [ ] Open Lead Conversion Wizard and verify conversion modes, suggestions, preview, source propagation, buttons, and warnings display Vietnamese
- [ ] Verify enum values sent to backend are unchanged; only UI labels are translated
- [ ] Verify primary CRM flows do not show mixed English/Vietnamese text or raw UUIDs in user-facing areas

## Lead Conversion Wizard QA

- [ ] Create Lead with Source = Facebook
- [ ] Change Lead status to `QUALIFIED`
- [ ] Click Convert Lead and verify the wizard opens
- [ ] Choose Create New Account
- [ ] Choose Create New Contact
- [ ] Choose Create New Opportunity
- [ ] Confirm Convert
- [ ] Verify Account / Contact / Opportunity are created
- [ ] Verify source and sourceDetail are copied to created records
- [ ] Verify Lead detail shows Converted Records with names and links, not UUIDs
- [ ] Try converting the converted Lead again and verify conversion is blocked
- [ ] Create Account A, create Contact A under Account A, create a Lead whose company matches Account A, open Convert Wizard, and verify Account A is suggested
- [ ] Select Use Existing Account A and Use Existing Contact A, then confirm conversion succeeds
- [ ] Create Account A, Account B, and Contact B under Account B; convert a Lead with Account A and Contact B, then verify backend blocks with `Selected contact does not belong to the selected account.`
- [ ] Select an existing Opportunity that does not belong to the selected Account and verify backend blocks with `Selected opportunity does not belong to the selected account.`

## Reference Display QA

- [ ] Open Lead detail and verify `Details`, `Related`, and `Activity` tabs are present
- [ ] Open Account detail and verify `Details`, `Related`, and `Activity` tabs are present
- [ ] Open Contact detail and verify `Details`, `Related`, and `Activity` tabs are present
- [ ] Open Opportunity detail and verify `Details`, `Related`, and `Activity` tabs are present
- [ ] Open Task detail and verify `Details`, `Related`, and `Activity` tabs are present
- [ ] Open Case detail and verify `Details`, `Related`, and `Activity` tabs are present
- [ ] On each detail page, verify user-facing fields do not show raw UUIDs for owner, assignee, account, contact, related records, or converted records
- [ ] On each detail page Activity tab, verify the current record's note/task still appears and unrelated records do not appear
- [ ] Open Task detail and verify Related To shows the related record name, not a UUID
- [ ] Open Task detail and verify Assigned To shows a user name, not a UUID
- [ ] Open Case detail and verify there is no Assigned To field unless backend exposes a real assigned user
- [ ] Open Account detail and verify related Contacts / Opportunities / Cases show readable names
- [ ] Open Account detail and verify Owner shows a user name if present
- [ ] Open Contact detail and verify Account shows the account name, not `accountId`
- [ ] Open Opportunity detail and verify Account / Owner show readable names
- [ ] Open Recycle Bin and verify deleted records show names plus owner names, not raw IDs

## Action Actor Tracking QA

### Task completion

- [ ] Admin creates a task assigned to a Sales user
- [ ] The Sales user or another authenticated user completes the task
- [ ] Open Task detail
- [ ] Verify `Người hoàn thành` shows the completing user name, not a UUID
- [ ] Verify `Thời gian hoàn thành` shows the completion timestamp

### Lead conversion

- [ ] Create a Lead
- [ ] Convert the Lead with the Lead Conversion Wizard
- [ ] Open Lead detail
- [ ] Verify `Người chuyển đổi` shows the converting user name, not a UUID
- [ ] Verify `Thời gian chuyển đổi` shows the conversion timestamp

### Opportunity stage tracking

- [ ] Open an Opportunity
- [ ] Change the stage
- [ ] Open Opportunity detail
- [ ] Verify `Người cập nhật giai đoạn gần nhất` shows the stage-changing user name, not a UUID
- [ ] Verify `Thời gian cập nhật giai đoạn` shows the stage change timestamp

### Case close tracking

- [ ] Open a Case
- [ ] Change status to `CLOSED`
- [ ] Open Case detail
- [ ] Verify `Người đóng yêu cầu` shows the closing user name, not a UUID
- [ ] Verify `Thời gian đóng` shows the close timestamp
- [ ] Change status away from `CLOSED`
- [ ] Verify close actor/time are cleared

### Future actor tracking

- [ ] After Recycle Bin actor tracking is implemented, verify deleted-by user and deleted timestamp

## Notes

- [ ] Record any failed step with the module name
- [ ] Capture whether the issue is backend, frontend, or API contract related
- [ ] Re-run the failed step after the fix
