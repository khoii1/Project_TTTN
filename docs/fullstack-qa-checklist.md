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
- [ ] Change Lead Status
- [ ] Convert Lead
- [ ] Verify Account created
- [ ] Verify Contact created
- [ ] Verify Opportunity created
- [ ] Open Account detail and verify related Contacts / Opportunities
- [ ] Open Opportunity detail and update stage
- [ ] Create Task for Opportunity
- [ ] Complete Task
- [ ] Create Case
- [ ] Update Case Status
- [ ] Logout
- [ ] Login as `admin@rival.com` / `Rival@123`
- [ ] Verify Rival Org cannot see Sample Company data

## Expected Results

- [ ] Auth redirects work for protected routes
- [ ] CRUD screens load without API contract errors
- [ ] Pagination uses backend `data/meta` responses
- [ ] Organization isolation is preserved across all modules
- [ ] No password, refresh token hash, or deleted records are exposed in UI responses

## Notes

- [ ] Record any failed step with the module name
- [ ] Capture whether the issue is backend, frontend, or API contract related
- [ ] Re-run the failed step after the fix
