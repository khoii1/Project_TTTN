import 'package:intl/intl.dart';

String formatCurrency(dynamic value) {
  final amount = _asNum(value);
  return NumberFormat.currency(locale: 'vi_VN', symbol: '₫', decimalDigits: 0).format(amount);
}

String formatDate(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '');
  if (date == null) return 'Chưa có';
  return DateFormat('dd/MM/yyyy HH:mm', 'vi_VN').format(date.toLocal());
}

String compactDate(dynamic value) {
  final date = DateTime.tryParse(value?.toString() ?? '');
  if (date == null) return 'Chưa có';
  return DateFormat('dd/MM/yyyy', 'vi_VN').format(date.toLocal());
}

String labelFor(String? value) {
  if (value == null || value.isEmpty) return 'Chưa có';
  return _labels[value] ?? value.replaceAll('_', ' ');
}

String recordName(Map<String, dynamic> record) {
  if (record['name'] != null) return record['name'].toString();
  if (record['subject'] != null) return record['subject'].toString();
  final firstName = record['firstName']?.toString() ?? '';
  final lastName = record['lastName']?.toString() ?? '';
  final fullName = [firstName, lastName].where((item) => item.trim().isNotEmpty).join(' ');
  if (fullName.isNotEmpty) return fullName;
  if (record['company'] != null) return record['company'].toString();
  return 'Bản ghi CRM';
}

String leadName(Map<String, dynamic> record) {
  final firstName = record['firstName']?.toString() ?? '';
  final lastName = record['lastName']?.toString() ?? '';
  final fullName = [firstName, lastName].where((item) => item.trim().isNotEmpty).join(' ');
  return fullName.isEmpty ? recordName(record) : fullName;
}

String subtitleFor(Map<String, dynamic> record) {
  final parts = <String>[
    if (record['company'] != null) record['company'].toString(),
    if (record['email'] != null) record['email'].toString(),
    if (record['phone'] != null) record['phone'].toString(),
    if (record['stage'] != null) labelFor(record['stage']?.toString()),
    if (record['status'] != null) labelFor(record['status']?.toString()),
  ];
  return parts.take(2).join(' • ');
}

bool looksLikeUuid(String value) {
  return RegExp(r'^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$').hasMatch(value);
}

num _asNum(dynamic value) {
  if (value is num) return value;
  return num.tryParse(value?.toString() ?? '') ?? 0;
}

const _labels = <String, String>{
  'ADMIN': 'Quản trị',
  'MANAGER': 'Quản lý',
  'SALES': 'Kinh doanh',
  'SUPPORT': 'Hỗ trợ',
  'NEW': 'Mới',
  'CONTACTED': 'Đã liên hệ',
  'NURTURING': 'Đang nuôi dưỡng',
  'QUALIFIED': 'Đủ điều kiện',
  'UNQUALIFIED': 'Không đủ điều kiện',
  'CONVERTED': 'Đã chuyển đổi',
  'QUALIFY': 'Thẩm định',
  'PROPOSE': 'Đề xuất',
  'NEGOTIATE': 'Đàm phán',
  'CLOSED_WON': 'Thắng',
  'CLOSED_LOST': 'Thua',
  'NOT_STARTED': 'Chưa bắt đầu',
  'IN_PROGRESS': 'Đang làm',
  'COMPLETED': 'Hoàn thành',
  'CANCELLED': 'Đã hủy',
  'LOW': 'Thấp',
  'NORMAL': 'Bình thường',
  'MEDIUM': 'Trung bình',
  'HIGH': 'Cao',
  'URGENT': 'Khẩn cấp',
  'WORKING': 'Đang xử lý',
  'RESOLVED': 'Đã xử lý',
  'CLOSED': 'Đã đóng',
  'FACEBOOK': 'Facebook',
  'WEBSITE': 'Website',
  'GOOGLE_ADS': 'Google Ads',
  'ZALO': 'Zalo',
  'PHONE': 'Gọi điện',
  'EMAIL': 'Email',
  'REFERRAL': 'Giới thiệu',
  'EVENT': 'Sự kiện',
  'IMPORT_CSV': 'Import CSV',
  'CHATBOT': 'Chatbot',
  'API': 'API',
  'OTHER': 'Khác',
  'MANUAL': 'Nhập tay',
  'CONVERTED_LEAD': 'Chuyển đổi từ Lead',
  'LEAD': 'Lead',
  'ACCOUNT': 'Account',
  'CONTACT': 'Contact',
  'OPPORTUNITY': 'Opportunity',
  'CASE': 'Case',
};
