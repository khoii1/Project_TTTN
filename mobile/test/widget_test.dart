import 'package:crm_mobile/core/api/api_config.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('uses deployed backend by default', () {
    expect(ApiConfig.baseUrl, 'https://project-tttn.onrender.com');
  });
}
