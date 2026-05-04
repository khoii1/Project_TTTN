# Fullstack QA Results

- Date: 2026-05-04
- QA run stamp: `20260504075714`
- Browser used: Chrome via Playwright automation
- Backend: running at `http://localhost:3000`
- Frontend: running at `http://localhost:3001`
- Test data org: Sample Company Inc.
- Rival org check account: `admin@rival.com`
- Source code changes during this QA run: none
- Build/lint/test rerun during this QA run: not run, per phase instruction not to rebuild and because no source bug fix was applied

## Summary

- Passed: 20 / 20
- Failed: 0 / 20
- Blocking bugs found: none
- Blocking fixes applied: none
- MVP demo readiness: yes, for the checked CRM flow

## Checklist Results

| Step | Action | Expected result | Actual result | Status | Bug found | Fix applied | Bug type |
|---:|---|---|---|---|---|---|---|
| 1 | Login as `admin@example.com` / `Admin@123` | Redirect to dashboard with authenticated session | Redirected to `http://localhost:3001/dashboard` | Pass | None | None | N/A |
| 2 | Open Dashboard | Dashboard loads summary cards | `Dashboard Overview` visible | Pass | None | None | N/A |
| 3 | Create Lead | Lead is created and appears in Sample Company org | Created lead `2495531c-9575-4f4d-9477-3aca4d71c617` | Pass | None | None | N/A |
| 4 | Add Note to Lead | Note appears on lead Activity Timeline and is saved | Note visible and saved as `a0efb719-1ee3-4ce7-a8d6-6cb4702ffc36` | Pass | None | None | N/A |
| 5 | Add Task to Lead by Related Lookup | Task is created with `relatedType=LEAD` and `relatedId=lead id` | Task `839c58b7-2eeb-4c33-a0f5-feb1f905bf05` linked to lead `2495531c-9575-4f4d-9477-3aca4d71c617` | Pass | None | None | N/A |
| 6 | Open Task detail and verify Related To | Related To shows record name and no raw UUID | Related To displayed Lead name for `Lead 20260504075714`; raw related UUID was not visible | Pass | None | None | N/A |
| 7 | Change Lead Status | Lead status changes to `QUALIFIED` | Lead status became `QUALIFIED` | Pass | None | None | N/A |
| 8 | Convert Lead | Lead converts and stores converted account/contact/opportunity ids | Converted to account `63970b7a-0623-40df-a9b3-bb902c029c36`, contact `52f72242-7019-41a0-b399-bdd1426d9012`, opportunity `d968ca56-d72e-4c21-afa9-fae57d342372` | Pass | None | None | N/A |
| 9 | Verify Account created | Converted account exists and detail page loads | Account `QA Company 20260504075714` loaded | Pass | None | None | N/A |
| 10 | Verify Contact created | Converted contact exists and detail page loads | Contact `QA Lead 20260504075714` loaded | Pass | None | None | N/A |
| 11 | Verify Opportunity created | Converted opportunity exists and detail page loads | Opportunity `New opportunity - QA Company 20260504075714` loaded | Pass | None | None | N/A |
| 12 | Open Account detail and verify related Contact/Opportunity | Account detail shows converted contact and opportunity in related tabs | Related contact and opportunity visible | Pass | None | None | N/A |
| 13 | Open Opportunity detail and update stage | Opportunity stage changes to `PROPOSE` | Stage became `PROPOSE` | Pass | None | None | N/A |
| 14 | Create Task for Opportunity | Task is created with `relatedType=OPPORTUNITY` and `relatedId=opportunity id` | Task `6f3fd591-e3f4-4bd9-b5a8-61de3e83da3e` linked to opportunity `d968ca56-d72e-4c21-afa9-fae57d342372` | Pass | None | None | N/A |
| 15 | Complete Task | Task status changes to `COMPLETED` | Task status became `COMPLETED` | Pass | None | None | N/A |
| 16 | Create Case | Case is created and appears in Sample Company org | Case `dc980cae-08c7-4437-a5c6-137414830460` created | Pass | None | None | N/A |
| 17 | Update Case Status | Case status changes to `WORKING` | Case status became `WORKING` | Pass | None | None | N/A |
| 18 | Logout | Session is cleared and user returns to login | Redirected to `http://localhost:3001/login` | Pass | None | None | N/A |
| 19 | Login as `admin@rival.com` / `Rival@123` | Rival admin logs in to Rival Org dashboard | Redirected to `http://localhost:3001/dashboard` | Pass | None | None | N/A |
| 20 | Verify Rival Org cannot see Sample Company data | Rival org list/API do not show Sample Company QA data | No matching lead/account/task visible in Rival org | Pass | None | None | N/A |

## Bugs Found

- No blocking frontend, backend, auth, data, or contract bug was found in the executed checklist.
- Automation-only selector/timing issues were encountered while driving Ant Design controls, but they were not application bugs and did not require source changes.

## Fixes Applied

- No source code fix was applied during this QA run.
- No backend or frontend architecture, API contract, middleware/proxy behavior, or feature scope was changed.

## Build / Lint / Test

- Backend build: not run in this phase, per instruction not to rebuild backend.
- Backend unit/e2e tests: not run in this phase because backend source was not changed.
- Frontend lint/build: not run in this phase, per instruction not to rebuild frontend and because frontend source was not changed during QA.

## Remaining TODOs

- Keep this QA data in mind when demoing, because the run created real records in Sample Company Inc.
- Next phase can focus on non-blocking UX polish or planned items after QA sign-off.
