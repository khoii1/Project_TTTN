import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'core/api/api_client.dart';
import 'core/auth/auth_controller.dart';
import 'features/auth/login_screen.dart';
import 'features/dashboard/home_shell.dart';

class CrmMobileApp extends StatelessWidget {
  const CrmMobileApp({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CRM Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF0176D3),
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: Colors.white,
        navigationBarTheme: const NavigationBarThemeData(
          height: 62,
          labelTextStyle: WidgetStatePropertyAll(TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
          iconTheme: WidgetStatePropertyAll(IconThemeData(size: 22)),
        ),
        listTileTheme: const ListTileThemeData(
          titleTextStyle: TextStyle(fontSize: 15, color: Color(0xFF172033)),
          subtitleTextStyle: TextStyle(fontSize: 12.5, color: Color(0xFF667085)),
        ),
        cardTheme: const CardThemeData(
          elevation: 0,
          margin: EdgeInsets.zero,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(8)),
            side: BorderSide(color: Color(0xFFE2E8F0)),
          ),
        ),
        appBarTheme: const AppBarTheme(
          centerTitle: false,
          backgroundColor: Colors.white,
          foregroundColor: Color(0xFF172033),
          elevation: 0,
          surfaceTintColor: Colors.white,
        ),
        inputDecorationTheme: const InputDecorationTheme(
          filled: true,
          fillColor: Color(0xFFF0F0F2),
          isDense: true,
          contentPadding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          border: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12)), borderSide: BorderSide.none),
          enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12)), borderSide: BorderSide.none),
          focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.all(Radius.circular(12)), borderSide: BorderSide(color: Color(0xFF0176D3))),
        ),
      ),
      builder: (context, child) {
        final mediaQuery = MediaQuery.of(context);
        return MediaQuery(
          data: mediaQuery.copyWith(
            textScaler: mediaQuery.textScaler.clamp(minScaleFactor: 0.9, maxScaleFactor: 1.05),
          ),
          child: child ?? const SizedBox.shrink(),
        );
      },
      home: Consumer<AuthController>(
        builder: (context, auth, _) {
          if (auth.isBootstrapping) {
            return const _SplashScreen();
          }

          if (!auth.isAuthenticated) {
            return LoginScreen(apiClient: apiClient);
          }

          return HomeShell(apiClient: apiClient);
        },
      ),
    );
  }
}

class _SplashScreen extends StatelessWidget {
  const _SplashScreen();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(child: CircularProgressIndicator()),
    );
  }
}
