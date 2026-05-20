import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'package:provider/provider.dart';

import 'app.dart';
import 'core/api/api_client.dart';
import 'core/api/api_config.dart';
import 'core/auth/auth_controller.dart';
import 'core/auth/token_store.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await initializeDateFormatting('vi_VN');

  final tokenStore = TokenStore();
  final apiClient = ApiClient(
    baseUrl: ApiConfig.baseUrl,
    tokenStore: tokenStore,
  );

  runApp(
    ChangeNotifierProvider(
      create: (_) => AuthController(apiClient: apiClient, tokenStore: tokenStore)..bootstrap(),
      child: CrmMobileApp(apiClient: apiClient),
    ),
  );
}
