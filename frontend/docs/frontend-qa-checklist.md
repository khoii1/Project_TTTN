# Frontend QA Checklist

Use this checklist to manually verify the CRM frontend before any major release.

## 1. Authentication & Security
- [ ] Login successfully with valid credentials
- [ ] Login fails with invalid credentials (shows error)
- [ ] Access token is attached to outbound requests (verify via network tab)
- [ ] Refresh token flow works (manually expire token or wait, verify 401 triggers `/auth/refresh` silently)
- [ ] Failed refresh token redirects user to `/login`
- [ ] Logout clears `crm_access_token` and `crm_refresh_token` cookies

## 2. Leads Module
- [ ] Create a new Lead with all fields
- [ ] View Lead detail page
- [ ] Change Lead status using the stepper
- [ ] "Convert Lead" button works and redirects/shows success
- [ ] Verify converted Lead generates corresponding Account, Contact, and Opportunity

## 3. Core CRM Modules (Accounts, Contacts, Opportunities)
- [ ] Accounts: Related Contacts, Opportunities, and Cases display correctly in tabs
- [ ] Contacts: Displays the parent Account
- [ ] Opportunities: Stage stepper updates successfully
- [ ] Activity Timeline: Notes and Tasks can be added and display correctly on all detail pages

## 4. Tasks & Cases
- [ ] Tasks: Mark task as complete using status dropdown
- [ ] Cases: Update case status and priority

## 5. Pagination, Search, & Filters
- [ ] Verify List pages (Leads, Accounts, Contacts, Opportunities, Tasks, Cases, Users) load data using `?page=1&limit=10`
- [ ] Test Search input correctly updates URL params and re-fetches on all modules
- [ ] Test specific filters (Status, Stage, Priority, Role) correctly update URL params and re-fetch

## 6. Role-Based Access Control (RBAC)
- [ ] Login as `ADMIN`: Verify Users page allows creating/deleting users
- [ ] Login as `SALES` or `MANAGER`: Verify Users list restricts destructive actions (Delete/New buttons hidden)

## 7. Multi-tenant Isolation
- [ ] Login as `admin@example.com` (Sample Company). Verify data belongs to Sample Company.
- [ ] Login as `admin@rival.com` (Rival Org). Verify data is completely isolated (no overlapping Leads/Accounts).
