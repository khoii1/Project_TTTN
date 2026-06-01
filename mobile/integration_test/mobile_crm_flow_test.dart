import 'package:crm_mobile/main.dart' as app;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('mobile CRM create edit forms and core navigation work on Android', (tester) async {
    final stamp = 'MOBILE_INTEGRATION_${DateTime.now().millisecondsSinceEpoch}';
    final emailStamp = stamp.toLowerCase().replaceAll('_', '.');
    final leadName = 'Lead $stamp';
    final accountName = 'Công ty $stamp';
    final contactName = 'Liên hệ $stamp';
    final opportunityName = 'Cơ hội $stamp';
    final taskSubject = 'Task $stamp';
    final caseSubject = 'Case $stamp';

    app.main();
    await pumpFor(tester, seconds: 3);

    if (find.byKey(const ValueKey('loginEmailField')).evaluate().isEmpty) {
      await logoutIfAuthenticated(tester);
    }

    await login(tester, 'admin@example.com', 'Admin@123');
    await expectLeadList(tester);

    await createLead(tester, stamp, leadName, emailStamp);
    await editCurrentRecordDescription(tester, 'Lead đã sửa $stamp');
    await changeCurrentLeadStatus(tester);
    await backToList(tester);

    await createAccount(tester, stamp, accountName);
    await editCurrentRecordDescription(tester, 'Account đã sửa $stamp');
    await backToList(tester);

    await createContact(tester, stamp, contactName, accountName, emailStamp);
    await editCurrentRecordDescription(tester, 'Contact đã sửa $stamp');
    await backToList(tester);

    await createOpportunity(tester, stamp, opportunityName, accountName);
    await editCurrentRecordDescription(tester, 'Opportunity đã sửa $stamp');
    await changeCurrentOpportunityStage(tester);
    await backToList(tester);

    await openMenuModule(tester, 'menuTaskButton');
    await createTask(tester, stamp, taskSubject);
    await editCurrentRecordDescription(tester, 'Task đã sửa $stamp');
    await completeCurrentTask(tester);
    await backToList(tester);
    await backToMenuIfStandalone(tester);

    await openGlobalSearch(tester, stamp);
    expect(find.textContaining(stamp), findsWidgets);
    await backToMenuIfStandalone(tester);

    await openMenuModule(tester, 'menuCaseButton');
    await createCase(tester, stamp, caseSubject, accountName);
    await editCurrentRecordDescription(tester, 'Case đã sửa $stamp');
    await changeCurrentCaseStatus(tester);
    await deleteCurrentRecord(tester);
    await openRecycleBinAndRestore(tester, caseSubject);
  });
}

Future<void> login(WidgetTester tester, String email, String password) async {
  await pumpUntilFound(tester, find.byKey(const ValueKey('loginEmailField')));
  await tester.enterText(find.byKey(const ValueKey('loginEmailField')), email);
  await tester.enterText(find.byKey(const ValueKey('loginPasswordField')), password);
  await tester.tap(find.byKey(const ValueKey('loginSubmitButton')));
  await pumpUntilFound(tester, find.byKey(const ValueKey('leadCreateButton')), timeout: const Duration(seconds: 45));
}

Future<void> logoutIfAuthenticated(WidgetTester tester) async {
  if (find.byKey(const ValueKey('loginEmailField')).evaluate().isNotEmpty) return;
  for (var i = 0; i < 5 && find.text('Menu').evaluate().isEmpty; i++) {
    await tester.pageBack();
    await pumpFor(tester);
    if (find.byKey(const ValueKey('loginEmailField')).evaluate().isNotEmpty) return;
  }
  await tapBottomDestination(tester, 'Menu');
  await pumpUntilFound(tester, find.byKey(const ValueKey('menuAccountPopupButton')));
  await tester.tap(find.byKey(const ValueKey('menuAccountPopupButton')));
  await pumpFor(tester);
  await tester.tap(find.text('Đăng xuất').last);
  await pumpUntilFound(tester, find.byKey(const ValueKey('loginEmailField')), timeout: const Duration(seconds: 20));
}

Future<void> expectLeadList(WidgetTester tester) async {
  await pumpUntilFound(tester, find.byKey(const ValueKey('leadCreateButton')));
  expect(find.text('Lead'), findsWidgets);
}

Future<void> createLead(WidgetTester tester, String stamp, String leadName, String emailStamp) async {
  await tapBottomDestination(tester, 'Lead');
  await tapKey(tester, 'leadCreateButton');
  await assertRequiredValidation(tester, 'leadSaveButton');
  await enterByKey(tester, 'recordField_firstName', 'Mobile');
  await enterByKey(tester, 'recordField_lastName', leadName);
  await enterByKey(tester, 'recordField_company', 'Lead Company $stamp');
  await enterByKey(tester, 'recordField_email', 'lead.$emailStamp@example.com');
  await enterByKey(tester, 'recordField_phone', '0908123456');
  await enterByKey(tester, 'recordField_description', 'Nhu cầu mobile $stamp');
  await tapKey(tester, 'leadSaveButton');
  await openRecordFromCurrentList(tester, stamp, 'leadSearchField');
  expect(find.textContaining('Nhu cầu mobile'), findsWidgets);
}

Future<void> createAccount(WidgetTester tester, String stamp, String accountName) async {
  await tapBottomDestination(tester, 'Công ty');
  await tapKey(tester, 'accountCreateButton');
  await assertRequiredValidation(tester, 'accountSaveButton');
  await enterByKey(tester, 'recordField_name', accountName);
  await enterByKey(tester, 'recordField_phone', '0908123457');
  await enterByKey(tester, 'recordField_description', 'Account mobile $stamp');
  await tapKey(tester, 'accountSaveButton');
  await openRecordFromCurrentList(tester, stamp, 'accountSearchField');
}

Future<void> createContact(WidgetTester tester, String stamp, String contactName, String accountName, String emailStamp) async {
  await tapBottomDestination(tester, 'Liên hệ');
  await tapKey(tester, 'contactCreateButton');
  await assertRequiredValidation(tester, 'contactSaveButton');
  await enterByKey(tester, 'recordField_firstName', 'Mobile');
  await enterByKey(tester, 'recordField_lastName', contactName);
  await selectDropdown(tester, 'recordField_accountId', accountName);
  await enterByKey(tester, 'recordField_email', 'contact.$emailStamp@example.com');
  await enterByKey(tester, 'recordField_phone', '0908123458');
  await enterByKey(tester, 'recordField_description', 'Contact mobile $stamp');
  await tapKey(tester, 'contactSaveButton');
  await openRecordFromCurrentList(tester, stamp, 'contactSearchField');
}

Future<void> createOpportunity(WidgetTester tester, String stamp, String opportunityName, String accountName) async {
  await tapBottomDestination(tester, 'Cơ hội');
  await tapKey(tester, 'opportunityCreateButton');
  await assertRequiredValidation(tester, 'opportunitySaveButton');
  await enterByKey(tester, 'recordField_name', opportunityName);
  await selectDropdown(tester, 'recordField_accountId', accountName);
  await enterByKey(tester, 'recordField_amount', '12500000');
  await enterByKey(tester, 'recordField_closeDate', '2026-06-30');
  await enterByKey(tester, 'recordField_description', 'Opportunity mobile $stamp');
  await tapKey(tester, 'opportunitySaveButton');
  await openRecordFromCurrentList(tester, stamp, 'opportunitySearchField');
  expect(find.textContaining('12'), findsWidgets);
}

Future<void> createTask(WidgetTester tester, String stamp, String subject) async {
  await tapKey(tester, 'taskCreateButton');
  await assertRequiredValidation(tester, 'taskSaveButton');
  await enterByKey(tester, 'recordField_subject', subject);
  await enterByKey(tester, 'recordField_dueDate', '2026-06-30');
  await enterByKey(tester, 'recordField_description', 'Task mobile $stamp');
  await tapKey(tester, 'taskSaveButton');
  await openRecordFromCurrentList(tester, stamp, 'taskSearchField');
}

Future<void> createCase(WidgetTester tester, String stamp, String subject, String accountName) async {
  await tapKey(tester, 'caseRecordCreateButton');
  await assertRequiredValidation(tester, 'caseRecordSaveButton');
  await enterByKey(tester, 'recordField_subject', subject);
  await selectDropdown(tester, 'recordField_accountId', accountName);
  await enterByKey(tester, 'recordField_description', 'Case mobile $stamp');
  await tapKey(tester, 'caseRecordSaveButton');
  await openRecordFromCurrentList(tester, stamp, 'caseRecordSearchField');
}

Future<void> editCurrentRecordDescription(WidgetTester tester, String description) async {
  await tapKey(tester, 'recordDetailMoreButton');
  await tapKey(tester, 'recordEditButton');
  await enterByKey(tester, 'recordField_description', description);
  final saveButton = find.byWidgetPredicate((widget) => widget.key is ValueKey && (widget.key as ValueKey).value.toString().endsWith('SaveButton')).first;
  await makeVisible(tester, saveButton);
  await tester.tap(saveButton);
  await pumpFor(tester, seconds: 2);
  await pumpUntilFound(tester, find.byKey(const ValueKey('recordDetailMoreButton')), timeout: const Duration(seconds: 30));
  await pumpUntilFound(tester, find.textContaining(description), timeout: const Duration(seconds: 20));
}

Future<void> changeCurrentLeadStatus(WidgetTester tester) async {
  await tapKey(tester, 'recordDetailMoreButton');
  await tapKey(tester, 'leadStatusButton');
  await tapKey(tester, 'picker_CONTACTED');
  await pumpUntilFound(tester, find.textContaining('Đã liên hệ'), timeout: const Duration(seconds: 20));
}

Future<void> changeCurrentOpportunityStage(WidgetTester tester) async {
  await tapKey(tester, 'recordDetailMoreButton');
  await tapKey(tester, 'opportunityStageButton');
  await tapKey(tester, 'picker_PROPOSE');
  await pumpUntilFound(tester, find.textContaining('Đề xuất'), timeout: const Duration(seconds: 20));
}

Future<void> completeCurrentTask(WidgetTester tester) async {
  await tapKey(tester, 'recordDetailMoreButton');
  await tapKey(tester, 'taskCompleteButton');
  await pumpUntilFound(tester, find.textContaining('Hoàn thành'), timeout: const Duration(seconds: 20));
}

Future<void> changeCurrentCaseStatus(WidgetTester tester) async {
  await tapKey(tester, 'recordDetailMoreButton');
  await tapKey(tester, 'caseStatusButton');
  await tapKey(tester, 'picker_WORKING');
  await pumpUntilFound(tester, find.textContaining('Đang xử lý'), timeout: const Duration(seconds: 20));
}

Future<void> deleteCurrentRecord(WidgetTester tester) async {
  await tapKey(tester, 'recordDetailMoreButton');
  await tapKey(tester, 'recordDeleteButton');
  await tapKey(tester, 'confirmDeleteButton');
  await pumpFor(tester, seconds: 2);
}

Future<void> openRecycleBinAndRestore(WidgetTester tester, String title) async {
  await backToMenuIfStandalone(tester);
  await tapKey(tester, 'menuRecycleBinButton');
  await pumpUntilFound(tester, find.textContaining(title), timeout: const Duration(seconds: 30));
  await tester.tap(find.byWidgetPredicate((widget) => widget.key is ValueKey && (widget.key as ValueKey).value.toString().startsWith('restoreButton_')).first);
  await pumpFor(tester, seconds: 2);
}

Future<void> openGlobalSearch(WidgetTester tester, String query) async {
  if (find.byKey(const ValueKey('menuGlobalSearchButton')).evaluate().isEmpty) {
    await tapBottomDestination(tester, 'Menu');
  }
  await tapKey(tester, 'menuGlobalSearchButton');
  await pumpUntilFound(tester, find.byKey(const ValueKey('globalSearchField')));
  await tester.enterText(find.byKey(const ValueKey('globalSearchField')), query);
  await pumpFor(tester, seconds: 2);
}

Future<void> openMenuModule(WidgetTester tester, String menuKey) async {
  await tapBottomDestination(tester, 'Menu');
  await tapKey(tester, menuKey);
  await pumpFor(tester, seconds: 2);
}

Future<void> openRecordFromCurrentList(WidgetTester tester, String stamp, String searchKey) async {
  await pumpUntilFound(tester, find.byKey(ValueKey(searchKey)), timeout: const Duration(seconds: 30));
  await tester.enterText(find.byKey(ValueKey(searchKey)), stamp);
  await pumpFor(tester, seconds: 2);
  final entity = searchKey.replaceFirst('SearchField', '');
  final recordFinder = find.byWidgetPredicate((widget) {
    final key = widget.key;
    if (key is! ValueKey) return false;
    final value = key.value.toString();
    return value.startsWith('${entity}Record_') && value.contains(stamp);
  });
  await pumpUntilFound(tester, recordFinder, timeout: const Duration(seconds: 30));
  await tester.tap(recordFinder.first);
  await pumpUntilFound(tester, find.byKey(const ValueKey('recordDetailMoreButton')), timeout: const Duration(seconds: 30));
}

Future<void> assertRequiredValidation(WidgetTester tester, String saveKey) async {
  await tapKey(tester, saveKey);
  await pumpFor(tester);
  expect(find.text('Bắt buộc'), findsWidgets);
}

Future<void> enterByKey(WidgetTester tester, String key, String value) async {
  final finder = find.byKey(ValueKey(key));
  await makeVisible(tester, finder);
  await tester.tap(finder);
  await tester.enterText(finder, value);
  await pumpFor(tester);
}

Future<void> selectDropdown(WidgetTester tester, String key, String visibleOption) async {
  final finder = find.byKey(ValueKey(key));
  await makeVisible(tester, finder);
  await tester.tap(finder);
  await pumpFor(tester);
  await pumpUntilFound(tester, find.textContaining(visibleOption), timeout: const Duration(seconds: 20));
  await tester.tap(find.textContaining(visibleOption).last);
  await pumpFor(tester);
}

Future<void> tapKey(WidgetTester tester, String key) async {
  final finder = find.byKey(ValueKey(key));
  await pumpUntilFound(tester, finder);
  await makeVisible(tester, finder);
  await tester.tap(finder);
  await pumpFor(tester);
}

Future<void> makeVisible(WidgetTester tester, Finder finder) async {
  if (find.byType(Scrollable).evaluate().isNotEmpty) {
    try {
      await tester.scrollUntilVisible(
        finder,
        260,
        scrollable: find.byType(Scrollable).last,
        maxScrolls: 18,
      );
      await pumpFor(tester);
    } catch (_) {
      // The widget may already be visible or belong to a non-form overlay.
    }
  }
  await tester.ensureVisible(finder);
}

Future<void> tapBottomDestination(WidgetTester tester, String label) async {
  final finder = find.text(label);
  await pumpUntilFound(tester, finder);
  await tester.tap(finder.last);
  await pumpFor(tester, seconds: 2);
}

Future<void> backToList(WidgetTester tester) async {
  await tapKey(tester, 'recordDetailBackButton');
  await pumpFor(tester, seconds: 2);
}

Future<void> backToMenuIfStandalone(WidgetTester tester) async {
  if (find.byKey(const ValueKey('recordListBackButton')).evaluate().isNotEmpty) {
    await tapKey(tester, 'recordListBackButton');
  }
  if (find.byKey(const ValueKey('globalSearchField')).evaluate().isNotEmpty) {
    await tester.pageBack();
    await pumpFor(tester);
  }
}

Future<void> pumpUntilFound(WidgetTester tester, Finder finder, {Duration timeout = const Duration(seconds: 20)}) async {
  final end = DateTime.now().add(timeout);
  while (DateTime.now().isBefore(end)) {
    await tester.pump(const Duration(milliseconds: 250));
    if (finder.evaluate().isNotEmpty) return;
  }
  expect(finder, findsWidgets);
}

Future<void> pumpFor(WidgetTester tester, {int seconds = 1}) async {
  for (var i = 0; i < seconds * 4; i++) {
    await tester.pump(const Duration(milliseconds: 250));
  }
}
