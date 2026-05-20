import 'package:flutter/foundation.dart';

import '../api/api_client.dart';
import '../models/api_models.dart';
import 'token_store.dart';

class AuthController extends ChangeNotifier {
  AuthController({
    required ApiClient apiClient,
    required TokenStore tokenStore,
  })  : _apiClient = apiClient,
        _tokenStore = tokenStore;

  final ApiClient _apiClient;
  final TokenStore _tokenStore;

  bool isBootstrapping = true;
  bool isLoading = false;
  UserProfile? user;
  String? errorMessage;

  bool get isAuthenticated => user != null;

  Future<void> bootstrap() async {
    isBootstrapping = true;
    notifyListeners();
    try {
      final refreshToken = await _tokenStore.getRefreshToken();
      if (refreshToken != null && refreshToken.isNotEmpty) {
        final result = await _apiClient.refresh();
        user = result.user;
      }
    } catch (_) {
      await _tokenStore.clear();
      user = null;
    } finally {
      isBootstrapping = false;
      notifyListeners();
    }
  }

  Future<bool> login(String email, String password) async {
    isLoading = true;
    errorMessage = null;
    notifyListeners();
    try {
      final result = await _apiClient.login(email, password);
      user = result.user;
      return true;
    } on ApiException catch (error) {
      errorMessage = error.message;
      return false;
    } catch (_) {
      errorMessage = 'Không thể đăng nhập. Vui lòng thử lại.';
      return false;
    } finally {
      isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    isLoading = true;
    notifyListeners();
    await _apiClient.logout();
    user = null;
    isLoading = false;
    notifyListeners();
  }

  Future<void> forceLogout() async {
    await _tokenStore.clear();
    user = null;
    notifyListeners();
  }
}
