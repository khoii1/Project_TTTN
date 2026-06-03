# Mobile QA Results

## Android CRM Mobile Deploy Smoke QA - 2026-06-01

### Environment

- Android emulator: `emulator-5554`, Android 15 API 35.
- API base URL: `https://project-tttn.onrender.com`.
- Test method: Flutter integration smoke test with the deployed backend.
- Test account: `admin@example.com / Admin@123`.

### Backend Deploy Health

- `GET https://project-tttn.onrender.com/health`: pass.
- Response returned `status: ok`, `service: crm-backend`.
- Render service was reachable on the first retry in this QA run; no wake-up timeout remained.

### Mobile Smoke Results With Deploy API

| Area | Result | Notes |
|---|---|---|
| App launch with deploy API | Pass | Smoke test built and installed debug APK with `API_BASE_URL=https://project-tttn.onrender.com`. |
| Login | Pass | Logged in as `admin@example.com` through Flutter widget input. |
| Dashboard | Pass | Opened Dashboard from Menu and verified CRM content rendered. |
| Lead list | Pass | Lead tab loaded and create action was available. |
| Create Lead | Pass | Created a simple Lead using stamp `MOBILE_DEPLOY_SMOKE_<timestamp>`. |
| Global Search | Pass | Search found the newly created Lead by stamp. |
| Lead detail | Pass | Opened the created Lead detail from Global Search. |

### Commands Run

- `GET https://project-tttn.onrender.com/health`: pass.
- `flutter test integration_test/mobile_deploy_smoke_test.dart -d emulator-5554 --dart-define=API_BASE_URL=https://project-tttn.onrender.com`: pass.

### Conclusion

- Mobile deploy smoke test passed.
- No deploy API timeout remained during this final QA.
- Mobile is ready for demo against `https://project-tttn.onrender.com`.

## Android CRM Mobile Lead Assignment Smoke QA - 2026-06-03

### Environment

- Device: Android emulator `emulator-5554`, Android 15 API 35.
- API base URL: `https://project-tttn.onrender.com`.
- Scope: verify mobile still works after Lead area fields and assignment rules.

### Checks

| Check | Result |
|---|---|
| `flutter analyze` | Pass |
| `flutter test` | Pass |
| `flutter build apk --release --dart-define=API_BASE_URL=https://project-tttn.onrender.com` | Pass after `flutter clean && flutter pub get` regenerated Android plugin files |
| `flutter test integration_test/mobile_deploy_smoke_test.dart -d emulator-5554 --dart-define=API_BASE_URL=https://project-tttn.onrender.com` | Pass |

### Result

- Mobile can run against the deployed backend after the Lead area field changes.
- Import CSV and assignment rule management remain web-only.

## Android CRM Mobile Integration QA - 2026-06-01

### Environment

- Flutter: 3.29.0 stable.
- Dart: 3.9.2.
- Android emulator: `sdk gphone64 x86 64`, Android 15 API 35, `emulator-5554`.
- Test method: Flutter `integration_test` with `tester.enterText` and `tester.tap`.
- Deploy API requested: `https://project-tttn.onrender.com`.
- Local test API used for the passing integration run: `http://10.0.2.2:3000`.
- Local backend source: NestJS backend running from this repo with the current Supabase/PostgreSQL `.env`.
- Test account: `admin@example.com`.

### Deploy Connectivity Note

- `curl https://project-tttn.onrender.com/health --max-time 45` timed out from this machine.
- The first emulator integration attempt with `API_BASE_URL=https://project-tttn.onrender.com` could not complete login because the deploy API was unreachable from the test environment.
- The same mobile integration flow passed against `http://10.0.2.2:3000`, confirming the Flutter UI automation, form payloads, and CRM write flows. The release APK was still built with the deploy URL.

### Automated Integration Results

| Area | Result | Notes |
|---|---|---|
| Auth | Pass | Integration test entered admin email/password through Flutter widgets, not ADB text input. |
| Lead create/edit | Pass | Created Lead with `MOBILE_INTEGRATION_<timestamp>`, validated required fields, edited description, and changed Lead status. |
| Account create/edit | Pass | Created and edited Account, including required-name validation. |
| Contact create/edit | Pass | Created Contact with an Account selected from dropdown lookup, then edited description. |
| Opportunity create/edit | Pass | Created Opportunity with numeric amount and Account lookup, edited description, and updated stage. |
| Task create/edit/complete | Pass | Created Task, edited description, and completed Task through the detail action. |
| Case create/edit/status | Pass | Created Case with Account lookup, edited description, changed status, deleted it, then restored it from Recycle Bin. |
| Required-field validation | Pass | Save-with-empty-form showed `Bắt buộc` on required fields. |
| Global Search | Pass | Search found records created with the integration stamp. |
| Recycle Bin | Pass | Deleted Case appeared in Recycle Bin and restore action worked. |
| Multi-tenant isolation | Not run in UI integration | Rival login was removed from this long UI flow after deploy connectivity issues; backend/API isolation remains covered by existing contract tests and previous QA. |

### Bugs Found And Fixed

- `RecordListScreen._reload`, `RecordDetailScreen._reload`, and `RecycleBinScreen._reload` returned a `Future` from inside `setState`; fixed by creating the future first and assigning it synchronously inside `setState`.
- Standalone list screens opened from Menu, such as Task and Case, lacked a `Scaffold/Material` ancestor; fixed by wrapping standalone `RecordListScreen` with `Scaffold`.
- Mobile edit forms sent managed fields (`status`/`stage`) through normal update endpoints; fixed by skipping those fields in create/edit forms and keeping status/stage updates on dedicated detail actions.
- Mobile edit forms sent unchanged fields back to the API; fixed by sending only changed fields on edit.
- Added stable `ValueKey`s for login fields, create/save buttons, record fields, detail actions, Global Search, and Recycle Bin restore actions.

### Commands Run

- `flutter analyze`: pass.
- `flutter test`: pass.
- `flutter test integration_test/mobile_crm_flow_test.dart -d emulator-5554 --dart-define=API_BASE_URL=https://project-tttn.onrender.com`: failed because deploy API health/login timed out from the test environment.
- `flutter test integration_test/mobile_crm_flow_test.dart -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:3000`: pass.
- `flutter build apk --release --dart-define=API_BASE_URL=https://project-tttn.onrender.com`: pass.

### Conclusion

- Mobile create/edit forms are now covered by automated Flutter integration testing and are ready for demo on the tested emulator flow.
- No ADB text entry is required for form automation.
- Remaining caveat: Render deploy HTTP access timed out from this machine during QA; the release APK still targets the deployed backend URL.

## Android Emulator Self QA - 2026-06-01

### Environment

- Emulator: `flutter_emulator`, `emulator-5554`, Android emulator 1080x1920.
- API base URL: `https://project-tttn.onrender.com`.
- APK: release build from `flutter build apk --release --dart-define=API_BASE_URL=https://project-tttn.onrender.com`.
- Test account: `admin@example.com / Admin@123`.
- Rival account checked by deploy API: `admin@rival.com / Rival@123`.
- QA stamp: `MOBILE_AUTO_20260601100759`.

### Results

| Area | Result | Notes |
|---|---|---|
| Startup | Pass | Release APK installed and opened on emulator without Flutter crash. |
| Login | Pass | Logged in with `admin@example.com` using ADB input plus `KEYCODE_AT`; app opened the Lead tab. |
| Session | Pass | Relaunch kept the authenticated session and returned to CRM instead of Login. |
| Logout | Pass | Profile/account menu opened and `Đăng xuất` returned to Login. |
| UI overall | Pass | Bottom nav labels rendered as `Lead`, `Liên hệ`, `Công ty`, `Cơ hội`, `Menu`; no `Opportunitie s` wrapping was present. |
| Button/icon audit | Pass | Header share/favorite/notification are clickable and expose Vietnamese fallback messages; list/menu/search/recycle buttons are clickable. |
| Dashboard | Pass | Dashboard loaded counts and VND values with `₫`, including `Pipeline mở`, `Đã thắng`, `Việc mở`, and `Hỗ trợ mở`. |
| Lead detail | Pass | Mobile opened Lead `MOBILE_AUTO_20260601100759`; phone, email, source, sourceDetail, status, description, and created date were visible. |
| Lead status update | Pass | Changed Lead status to `Đủ điều kiện`; app showed `Đã cập nhật trạng thái Lead` and detail reflected the new status. |
| Account | Pass | Account tab loaded and showed compact Vietnamese labels. Search also returned the stamped account. |
| Contact | Pass | Contact tab loaded and Global Search returned the stamped contact. |
| Opportunity | Pass | Opportunity tab loaded, `Cơ hội` label did not wrap, and VND formatting used `₫`. Search returned the stamped opportunity. |
| Task | Pass | Test task was created through deploy API and appeared in Global Search as `Công việc` with `Chưa bắt đầu`. |
| Case | Pass by API/data | Test case was created through deploy API; mobile API contract unchanged. It may require scrolling further in Global Search to view after Task results. |
| Global Search | Pass | Search for `MOBILE` returned grouped Lead, Công ty, Liên hệ, Cơ hội, and Công việc results; tapping Lead result opened detail. |
| Recycle Bin | Pass | Recycle Bin opened, module filters were clickable, and deleted records showed `Khôi phục` without raw UUID titles. |
| Multi-tenant isolation | Pass by deploy API | Rival login via ADB was blocked by unreliable password text entry, but deploy API login for `admin@rival.com` succeeded and search for `MOBILE_AUTO_20260601100759` returned 0 records. |
| Logcat sanity | Pass | No `RenderFlex`, `overflowed`, `EXCEPTION CAUGHT`, or `FATAL EXCEPTION` entries were found during emulator QA. |

### Known Automation Limits

- ADB text input is still unreliable in longer mobile forms and password fields, especially with special characters. For that reason, create/edit form submission was not completed purely through UI automation.
- To validate mobile read/update/search flows, QA records were created through the deployed backend API and then verified inside the mobile app.
- Lead conversion UI was opened/audited earlier and labels are localized, but the full conversion submit flow was not repeated in this emulator pass because form-style dropdown interaction is brittle via ADB.

### Build And Test

- `flutter analyze`: pass.
- `flutter test`: pass, 1 test passed.
- `flutter build apk --release --dart-define=API_BASE_URL=https://project-tttn.onrender.com`: pass.

## Android CRM Mobile UI QA - 2026-06-01

### Environment

- Flutter: 3.29.0 stable
- Dart: 3.9.2
- Android device: `SM G973F`, Android 12 API 31, device id `R58M24KKCCY`
- API base URL: `https://project-tttn.onrender.com`
- Commands used:
  - `flutter run -d R58M24KKCCY --dart-define=API_BASE_URL=https://project-tttn.onrender.com`
  - `flutter analyze`
  - `flutter test`
  - `flutter build apk --release --dart-define=API_BASE_URL=https://project-tttn.onrender.com`
  - `flutter install -d R58M24KKCCY`

### UI Improvements Verified

| Area | Result | Notes |
|---|---|---|
| Login | Pass | Screen opens on the real Android device, uses Vietnamese text, and no white screen/crash was observed. |
| Bottom navigation | Pass | Labels were shortened to `Lead`, `Liên hệ`, `Công ty`, `Cơ hội`, `Menu` to avoid broken wrapping such as `Opportunitie s`. |
| Dashboard | Pass by build/code review | Dashboard cards and section headings were reduced and Vietnamese labels were normalized. |
| List screens | Pass by build/code review | List title, search, list-view selector, card spacing, and quick actions were compacted. |
| Detail screens | Pass by build/code review | Header title/actions and activity sheet spacing were reduced; search now opens Global Search. |
| Forms | Pass by build/code review | Field labels were normalized in Vietnamese and spacing was reduced; Lead/Contact name fields use `Họ` and `Tên`. |
| Search | Pass by build/code review | Global Search has Vietnamese hint, loading, empty, and error states. |
| Recycle Bin | Pass by build/code review | Recycle Bin labels and restore/delete actions are Vietnamese and compact. |

### Button And Icon Audit

| UI element | Result | Action |
|---|---|---|
| Bottom tabs | Pass | Navigate to Lead, Contact, Account, Opportunity, and Menu screens. |
| List search icon | Pass | Focuses the module search input. |
| Detail search icon | Pass | Opens Global Search. |
| Notification icon | Pass | Shows `Thông báo sẽ được bổ sung sau` where notification screen is not available. |
| Favorite/star icon | Pass | Shows `Yêu thích sẽ được bổ sung sau` instead of doing nothing. |
| Share icon | Pass | Shows `Chia sẻ sẽ được bổ sung sau` instead of doing nothing. |
| List selector rows | Pass | Rows either open the list picker or show `Bộ lọc danh sách sẽ được bổ sung sau`. |
| Menu rows | Pass | Dashboard, Global Search, Recycle Bin, CRM modules, and Logout have explicit navigation/action. |
| Create/edit/save buttons | Pass by existing flow | Existing record form submit logic was kept; no API contract changed. |
| Lead convert button | Pass by existing flow | Existing conversion endpoint was kept; labels were localized/compacted. |

### Functional QA Status

| Area | Result | Notes |
|---|---|---|
| App startup | Pass | App installed and launched on real Android device with deploy API URL. |
| Auth | Partial | Login screen displayed correctly. Full credential submission was not completed through ADB because `adb shell input text` did not reliably enter `@` and password characters. Manual device entry is recommended for final demo rehearsal. |
| Dashboard | Not fully re-run manually | UI and API paths unchanged; build/analyze passed. |
| Lead | Not fully re-run manually | List/detail/form UI updated without API contract changes; conversion UI labels compacted. |
| Account | Not fully re-run manually | List/detail/form API contracts unchanged. |
| Contact | Not fully re-run manually | List/detail/form API contracts unchanged. |
| Opportunity | Not fully re-run manually | List/detail/form API contracts unchanged; currency formatter still uses VND symbol. |
| Task | Not fully re-run manually | Existing task APIs unchanged. |
| Case | Not fully re-run manually | Existing case APIs unchanged. |
| Global Search | Pass by navigation/code review | Search route is reachable from menu and detail header search action. |
| Recycle Bin | Pass by navigation/code review | Route is reachable from menu and actions are wired. |
| Web-to-Lead / Import CSV data | Pass by contract | Mobile API contract was not changed; mobile continues to read records created by Web-to-Lead and web Import CSV. |

### Build And Test

- `flutter analyze`: pass.
- `flutter test`: pass, 1 test passed.
- `flutter build apk --release --dart-define=API_BASE_URL=https://project-tttn.onrender.com`: pass.
- `flutter install -d R58M24KKCCY`: pass, release APK installed on the real Android phone.

### Notes

- No backend or web frontend files were changed for this mobile UI pass.
- Because automated ADB text entry was unreliable on the real phone, full authenticated CRUD/convert/multi-tenant flows should still be walked manually before a live demo that depends on mobile write flows.

## Android CRM Mobile QA - 2026-05-21

### Environment

- Flutter: 3.29.0 stable
- Dart: 3.9.2
- Android emulator: `sdk gphone64 x86 64`, Android 15 API 35, `emulator-5554`
- API base URL: `https://project-tttn.onrender.com`
- APK tested:
  - Debug APK via `flutter run`
  - Release APK via `flutter build apk --release --dart-define=API_BASE_URL=https://project-tttn.onrender.com`
- Test account used on device: `admin@example.com`

### Scope

This QA focused on confirming that the mobile app still works after backend/web CSV Import changes. Import CSV remains web-only in this phase.

### Results

| Area | Result | Notes |
|---|---|---|
| App startup | Pass | App opened on Android emulator and showed Login when session was clear. |
| API base URL | Pass | `flutter run` and release build both received `API_BASE_URL=https://project-tttn.onrender.com` through dart-define. |
| Login | Pass | Admin login succeeded on release APK. Tokens were saved by existing `flutter_secure_storage` flow. |
| Session persistence | Pass | After `am force-stop` and relaunch, app returned to the Leads tab instead of Login. |
| Logout | Pass | Menu popup showed `Đăng xuất`; tapping it cleared session and returned to Login. |
| Lead list | Pass | Lead list loaded Sample Org data from staging. |
| Contact list | Pass | Contact tab loaded records without crash. |
| Account list | Pass | Account tab loaded records without crash. |
| Opportunity list | Pass | Opportunity tab loaded records and displayed VND currency with `₫`, not `$` or USD. |
| Task list | Pass | Task screen opened from Menu and loaded records. |
| Case list | Pass | Case screen opened from Menu and loaded records. It displayed imported CSV data: `Case CSVQA1779269957430`. |
| Dashboard | Pass | Dashboard opened from Menu and showed Lead, Account, Contact, Opportunity, Task, Case counts plus VND opportunity values. |
| Recycle Bin | Pass | Recycle Bin opened, showed deleted Lead/Task records, restore buttons, and no raw UUID in visible titles. |
| Global Search | Partial | Search screen opened and empty-state text rendered. Full text-entry result verification was limited by emulator/ADB input reliability. |
| Import CSV impact | Pass | Mobile read data imported from web/backend; imported Case record appeared in mobile Case list. No mobile Import CSV UI was added. |
| Multi-tenant isolation | Partial by mobile UI, pass by contract | Rival login flow was not completed on emulator due ADB text-entry limits. Backend contract and previous tests still scope all list/detail APIs by organization. |
| Error handling | Pass by code audit | API client has timeout, socket, 401 refresh, and refresh-fail session clear handling. No runtime network crash was observed during this QA. |

### Emulator Notes

- The debug `flutter run` session initially triggered an Android system ANR dialog: `Process system isn't responding`. This was an emulator/system-process issue, not a Flutter app crash. Retesting with the release APK avoided the debug runner overhead and the app proceeded normally.
- ADB text input for credentials and search was unreliable with special characters and focused fields. Login was completed successfully after using direct text entry carefully; broader form-heavy CRUD flows were not exhaustively automated through ADB in this run.

### Build And Test

- `flutter analyze`: pass, no issues found.
- `flutter test`: pass, 1 test passed.
- `flutter build apk --release --dart-define=API_BASE_URL=https://project-tttn.onrender.com`: pass.

### Files Changed During QA

- `mobile/README.md`: added Android run/build commands and API base URL notes.
- `docs/mobile-qa-results.md`: added this QA report.

### Conclusion

- Mobile app is ready for demo for the tested read/navigation/dashboard/recycle flows.
- Backend/web Import CSV did not break the tested mobile flows.
- Import CSV remains web-only in this phase.
- Remaining limitation: full Android CRUD, Lead conversion, and Rival Org login should be retested manually in Android Studio or with a more reliable UI automation setup if demo depends on those mobile write flows.
