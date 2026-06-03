# CRM Mobile

Flutter mobile app for the Project CRM MVP.

## Android Run

Use `API_BASE_URL` through `dart-define`; do not hardcode backend URLs in code.

Check connected Android devices:

```bash
flutter devices
```

Staging/demo backend:

```bash
flutter run -d emulator-5554 --dart-define=API_BASE_URL=https://project-tttn.onrender.com
```

Real Android phone example:

```bash
flutter run -d <device-id> --dart-define=API_BASE_URL=https://project-tttn.onrender.com
```

Local backend from Android emulator:

```bash
flutter run -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

Android emulator uses `10.0.2.2` to reach the host machine. `localhost` inside the emulator points to the emulator itself.

Release APK build:

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://project-tttn.onrender.com
```

## Integration Test

Mobile create/edit forms are covered by a Flutter `integration_test` flow. The test uses widget keys and `tester.enterText`, so it does not depend on unstable `adb shell input text`.

Run against the deployed backend when the network can reach Render:

```bash
flutter test integration_test/mobile_crm_flow_test.dart -d emulator-5554 --dart-define=API_BASE_URL=https://project-tttn.onrender.com
```

If the deploy backend is unreachable from the emulator but a local backend is running, use:

```bash
flutter test integration_test/mobile_crm_flow_test.dart -d emulator-5554 --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

The integration test logs in, validates required fields, creates/edits Lead, Account, Contact, Opportunity, Task, Case, checks status/stage/complete actions, runs Global Search, and restores a record from Recycle Bin.

## Mobile UI Notes

- Bottom navigation uses compact Vietnamese labels: `Lead`, `Liên hệ`, `Công ty`, `Cơ hội`, `Menu`.
- Search actions open the module search field or Global Search screen.
- Header actions that are not implemented yet show a Vietnamese snackbar instead of doing nothing.
- Import CSV remains web-only; mobile can read CRM records created by Web-to-Lead or CSV import through the existing APIs.

## Lead Area Fields

Mobile Lead create/edit and detail support `provinceName`, `wardName`, and `addressDetail`. Lead assignment rule management remains web-only under `/dashboard/settings/lead-assignment`; mobile reads the assigned Lead data through the existing APIs.

## Import CSV Status

Import CSV was not changed in the mobile app during this phase.

Current CSV import support is web-only for these CRM modules:

- Lead
- Account
- Contact
- Opportunity
- Task
- Case

Use the web CRM list pages to download sample CSV files, upload CSV files, and review per-row import results. Mobile can continue using the existing CRM API flows, but it does not currently expose an Import CSV screen.

## Getting Started

Install dependencies and check the project:

```bash
flutter pub get
flutter analyze
flutter test
```

A few resources to get you started if this is your first Flutter project:

- [Lab: Write your first Flutter app](https://docs.flutter.dev/get-started/codelab)
- [Cookbook: Useful Flutter samples](https://docs.flutter.dev/cookbook)

For help getting started with Flutter development, view the
[online documentation](https://docs.flutter.dev/), which offers tutorials,
samples, guidance on mobile development, and a full API reference.
