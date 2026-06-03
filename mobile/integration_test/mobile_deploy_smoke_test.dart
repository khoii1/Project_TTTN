import 'package:crm_mobile/main.dart' as app;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('mobile deploy smoke test covers login dashboard lead search and create', (tester) async {
    final stamp = 'MOBILE_DEPLOY_SMOKE_${DateTime.now().millisecondsSinceEpoch}';
    final emailStamp = stamp.toLowerCase().replaceAll('_', '.');

    app.main();
    await pumpFor(tester, seconds: 3);

    if (find.byKey(const ValueKey('loginEmailField')).evaluate().isEmpty) {
      await logoutIfNeeded(tester);
    }

    await login(tester, 'admin@example.com', 'Admin@123');
    await pumpUntilFound(tester, find.byKey(const ValueKey('leadCreateButton')), timeout: const Duration(seconds: 45));

    await openDashboard(tester);
    expect(find.textContaining('Lead'), findsWidgets);

    await tapBottomDestination(tester, 'Lead');
    await pumpUntilFound(tester, find.byKey(const ValueKey('leadCreateButton')), timeout: const Duration(seconds: 30));

    await createSimpleLead(tester, stamp, emailStamp);
    await openGlobalSearch(tester, stamp);
    expect(find.textContaining(stamp), findsWidgets);

    final result = find.byWidgetPredicate((widget) {
      final key = widget.key;
      return key is ValueKey && key.value.toString().startsWith('globalSearchResult_') && key.value.toString().contains(stamp);
    });
    await pumpUntilFound(tester, result, timeout: const Duration(seconds: 30));
    await tester.tap(result.first);
    await pumpUntilFound(tester, find.byKey(const ValueKey('recordDetailMoreButton')), timeout: const Duration(seconds: 30));
    expect(find.textContaining(stamp), findsWidgets);
  });
}

Future<void> login(WidgetTester tester, String email, String password) async {
  await pumpUntilFound(tester, find.byKey(const ValueKey('loginEmailField')));
  await tester.enterText(find.byKey(const ValueKey('loginEmailField')), email);
  await tester.enterText(find.byKey(const ValueKey('loginPasswordField')), password);
  await tester.tap(find.byKey(const ValueKey('loginSubmitButton')));
  await pumpFor(tester, seconds: 2);
}

Future<void> logoutIfNeeded(WidgetTester tester) async {
  for (var i = 0; i < 4 && find.text('Menu').evaluate().isEmpty; i++) {
    await tester.binding.handlePopRoute();
    await pumpFor(tester);
  }
  if (find.text('Menu').evaluate().isEmpty) return;
  await tapBottomDestination(tester, 'Menu');
  if (find.byKey(const ValueKey('menuAccountPopupButton')).evaluate().isEmpty) return;
  await tester.tap(find.byKey(const ValueKey('menuAccountPopupButton')));
  await pumpFor(tester);
  if (find.text('Đăng xuất').evaluate().isNotEmpty) {
    await tester.tap(find.text('Đăng xuất').last);
    await pumpUntilFound(tester, find.byKey(const ValueKey('loginEmailField')), timeout: const Duration(seconds: 20));
  }
}

Future<void> openDashboard(WidgetTester tester) async {
  await tapBottomDestination(tester, 'Menu');
  await tapKey(tester, 'menuDashboardButton');
  await pumpFor(tester, seconds: 3);
  await tester.binding.handlePopRoute();
  await pumpFor(tester);
}

Future<void> createSimpleLead(WidgetTester tester, String stamp, String emailStamp) async {
  await tapKey(tester, 'leadCreateButton');
  await enterByKey(tester, 'recordField_firstName', 'Smoke');
  await enterByKey(tester, 'recordField_lastName', stamp);
  await enterByKey(tester, 'recordField_company', 'Deploy Smoke $stamp');
  await enterByKey(tester, 'recordField_email', 'mobile.deploy.smoke.$emailStamp@example.com');
  await enterByKey(tester, 'recordField_phone', '0908123456');
  await enterByKey(tester, 'recordField_description', 'Lead smoke test deploy $stamp');
  await tapKey(tester, 'leadSaveButton');
  await pumpUntilFound(tester, find.byKey(const ValueKey('leadSearchField')), timeout: const Duration(seconds: 30));
}

Future<void> openGlobalSearch(WidgetTester tester, String query) async {
  await tapBottomDestination(tester, 'Menu');
  await tapKey(tester, 'menuGlobalSearchButton');
  await pumpUntilFound(tester, find.byKey(const ValueKey('globalSearchField')));
  await tester.enterText(find.byKey(const ValueKey('globalSearchField')), query);
  await pumpFor(tester, seconds: 3);
}

Future<void> enterByKey(WidgetTester tester, String key, String value) async {
  final finder = find.byKey(ValueKey(key));
  await makeVisible(tester, finder);
  await tester.tap(finder);
  await tester.enterText(finder, value);
  await pumpFor(tester);
}

Future<void> tapKey(WidgetTester tester, String key) async {
  final finder = find.byKey(ValueKey(key));
  await pumpUntilFound(tester, finder);
  await makeVisible(tester, finder);
  await tester.tap(finder);
  await pumpFor(tester);
}

Future<void> tapBottomDestination(WidgetTester tester, String label) async {
  await pumpUntilFound(tester, find.text(label));
  await tester.tap(find.text(label).last);
  await pumpFor(tester, seconds: 2);
}

Future<void> makeVisible(WidgetTester tester, Finder finder) async {
  if (find.byType(Scrollable).evaluate().isNotEmpty) {
    try {
      await tester.scrollUntilVisible(finder, 260, scrollable: find.byType(Scrollable).last, maxScrolls: 18);
      await pumpFor(tester);
    } catch (_) {}
  }
  await tester.ensureVisible(finder);
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
