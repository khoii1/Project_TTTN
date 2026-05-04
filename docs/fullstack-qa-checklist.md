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
- [ ] Create Task, select Related Type = Opportunity, search Opportunity by name, select Opportunity, submit, and verify `relatedId` is saved correctly
- [ ] Open Task detail, verify Related To shows the related record name instead of UUID, then click it and verify navigation to the related detail page
- [ ] Complete Task
- [ ] Create Task, delete Task, verify it disappears from Active list, open Deleted tab, restore Task, and verify it returns to Active list
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

## Recycle Bin QA

- [ ] Create Task
- [ ] Delete Task
- [ ] Open Recycle Bin
- [ ] Verify Task appears in Recycle Bin
- [ ] Restore Task
- [ ] Verify Task disappears from Recycle Bin
- [ ] Verify Task appears again in Tasks list
- [ ] Create Lead
- [ ] Delete Lead
- [ ] Open Recycle Bin
- [ ] Restore Lead
- [ ] Verify Lead appears again in Leads list

## Source QA

- [ ] Create Lead with Source = Facebook
- [ ] Convert Lead
- [ ] Verify Account source = Facebook
- [ ] Verify Contact source = Facebook
- [ ] Verify Opportunity source = Facebook
- [ ] Create Case with Source = Email
- [ ] Verify Case detail shows Source = Email

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

## Reference Display QA

- [ ] Open Task detail and verify Related To shows the related record name, not a UUID
- [ ] Open Task detail and verify Assigned To shows a user name, not a UUID
- [ ] Open Account detail and verify related Contacts / Opportunities / Cases show readable names
- [ ] Open Account detail and verify Owner shows a user name if present
- [ ] Open Contact detail and verify Account shows the account name, not `accountId`
- [ ] Open Opportunity detail and verify Account / Owner show readable names
- [ ] Open Recycle Bin and verify deleted records show names plus owner names, not raw IDs

## Notes

- [ ] Record any failed step with the module name
- [ ] Capture whether the issue is backend, frontend, or API contract related
- [ ] Re-run the failed step after the fix
