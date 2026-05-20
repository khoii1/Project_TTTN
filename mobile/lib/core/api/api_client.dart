import 'dart:convert';
import 'dart:async';
import 'dart:io';

import 'package:http/http.dart' as http;

import '../auth/token_store.dart';
import '../models/api_models.dart';

class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode});

  final String message;
  final int? statusCode;

  @override
  String toString() => message;
}

class ApiClient {
  ApiClient({
    required String baseUrl,
    required TokenStore tokenStore,
    http.Client? httpClient,
  })  : _baseUri = Uri.parse(baseUrl.replaceAll(RegExp(r'/+$'), '')),
        _tokenStore = tokenStore,
        _http = httpClient ?? http.Client();

  final Uri _baseUri;
  final TokenStore _tokenStore;
  final http.Client _http;
  static const _requestTimeout = Duration(seconds: 30);

  Future<AuthResult> login(String email, String password) async {
    final json = await post('/auth/login', body: {'email': email, 'password': password}, authorized: false);
    final result = AuthResult.fromJson(json);
    if (result.accessToken.isEmpty || result.refreshToken.isEmpty) {
      throw const ApiException('Phản hồi đăng nhập không hợp lệ.');
    }
    await _tokenStore.saveTokens(accessToken: result.accessToken, refreshToken: result.refreshToken);
    return result;
  }

  Future<void> logout() async {
    try {
      await post('/auth/logout');
    } finally {
      await _tokenStore.clear();
    }
  }

  Future<AuthResult> refresh() async {
    final refreshToken = await _tokenStore.getRefreshToken();
    if (refreshToken == null || refreshToken.isEmpty) {
      throw const ApiException('Phiên đăng nhập đã hết hạn.', statusCode: 401);
    }

    final json = await post('/auth/refresh', body: {'refreshToken': refreshToken}, authorized: false);
    final result = AuthResult.fromJson(json);
    await _tokenStore.saveTokens(accessToken: result.accessToken, refreshToken: result.refreshToken);
    return result;
  }

  Future<dynamic> get(String path, {Map<String, dynamic>? query, bool authorized = true}) {
    return _send('GET', path, query: query, authorized: authorized);
  }

  Future<dynamic> post(String path, {Map<String, dynamic>? body, bool authorized = true}) {
    return _send('POST', path, body: body, authorized: authorized);
  }

  Future<dynamic> patch(String path, {Map<String, dynamic>? body, bool authorized = true}) {
    return _send('PATCH', path, body: body, authorized: authorized);
  }

  Future<dynamic> delete(String path, {bool authorized = true}) {
    return _send('DELETE', path, authorized: authorized);
  }

  Future<PaginatedResult> list(
    RecordDefinition definition, {
    int page = 1,
    int limit = 20,
    String? search,
    Map<String, dynamic>? filters,
  }) async {
    final query = <String, dynamic>{'page': page, 'limit': limit, ...?filters};
    if (search != null && search.trim().isNotEmpty) {
      query['search'] = search.trim();
    }
    final json = await get(definition.endpoint, query: query);
    return PaginatedResult.fromJson(json);
  }

  Future<Map<String, dynamic>> detail(RecordDefinition definition, String id) async {
    final json = await get('${definition.endpoint}/$id');
    return Map<String, dynamic>.from(json as Map);
  }

  Future<dynamic> _send(
    String method,
    String path, {
    Map<String, dynamic>? query,
    Map<String, dynamic>? body,
    bool authorized = true,
    bool retried = false,
  }) async {
    late final http.Response response;
    try {
      response = await _rawSend(method, path, query: query, body: body, authorized: authorized);
    } on TimeoutException {
      throw const ApiException('Kết nối API quá lâu. Vui lòng kiểm tra mạng hoặc thử lại.');
    } on SocketException {
      throw const ApiException('Không có kết nối mạng. Vui lòng thử lại.');
    } on http.ClientException {
      throw const ApiException('Không thể kết nối API. Vui lòng thử lại.');
    }

    if (response.statusCode == 401 && authorized && !retried) {
      try {
        await refresh();
        return _send(method, path, query: query, body: body, authorized: authorized, retried: true);
      } catch (_) {
        await _tokenStore.clear();
        throw const ApiException('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', statusCode: 401);
      }
    }

    return _decodeResponse(response);
  }

  Future<http.Response> _rawSend(
    String method,
    String path, {
    Map<String, dynamic>? query,
    Map<String, dynamic>? body,
    required bool authorized,
  }) async {
    final uri = _baseUri.replace(
      path: '${_baseUri.path}${path.startsWith('/') ? path : '/$path'}',
      queryParameters: _stringifyQuery(query),
    );

    final headers = <String, String>{
      HttpHeaders.contentTypeHeader: 'application/json',
      HttpHeaders.acceptHeader: 'application/json',
    };

    if (authorized) {
      final token = await _tokenStore.getAccessToken();
      if (token != null && token.isNotEmpty) {
        headers[HttpHeaders.authorizationHeader] = 'Bearer $token';
      }
    }

    switch (method) {
      case 'GET':
        return _http.get(uri, headers: headers).timeout(_requestTimeout);
      case 'POST':
        return _http.post(uri, headers: headers, body: jsonEncode(body ?? const <String, dynamic>{})).timeout(_requestTimeout);
      case 'PATCH':
        return _http.patch(uri, headers: headers, body: jsonEncode(body ?? const <String, dynamic>{})).timeout(_requestTimeout);
      case 'DELETE':
        return _http.delete(uri, headers: headers).timeout(_requestTimeout);
      default:
        throw ApiException('HTTP method không hỗ trợ: $method');
    }
  }

  dynamic _decodeResponse(http.Response response) {
    final text = response.body.trim();
    final data = text.isEmpty ? null : jsonDecode(text);

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    }

    throw ApiException(_extractError(data), statusCode: response.statusCode);
  }

  String _extractError(dynamic data) {
    if (data is Map && data['message'] is List) {
      return (data['message'] as List).join(', ');
    }
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    return 'Không thể kết nối API. Vui lòng thử lại.';
  }

  Map<String, String>? _stringifyQuery(Map<String, dynamic>? query) {
    if (query == null || query.isEmpty) return null;
    final result = <String, String>{};
    for (final entry in query.entries) {
      final value = entry.value;
      if (value == null || value.toString().isEmpty) continue;
      result[entry.key] = value.toString();
    }
    return result;
  }
}
