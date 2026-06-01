enum EntityType {
  lead,
  account,
  contact,
  opportunity,
  task,
  caseRecord,
}

class PaginatedResult {
  const PaginatedResult({
    required this.items,
    required this.page,
    required this.limit,
    required this.total,
    required this.totalPages,
  });

  final List<Map<String, dynamic>> items;
  final int page;
  final int limit;
  final int total;
  final int totalPages;

  factory PaginatedResult.fromJson(dynamic json) {
    if (json is List) {
      return PaginatedResult(
        items: json.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList(),
        page: 1,
        limit: json.length,
        total: json.length,
        totalPages: 1,
      );
    }

    final map = Map<String, dynamic>.from(json as Map);
    final meta = Map<String, dynamic>.from(map['meta'] as Map? ?? {});
    final data = map['data'] as List? ?? const [];

    return PaginatedResult(
      items: data.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList(),
      page: _asInt(meta['page'], 1),
      limit: _asInt(meta['limit'], data.length),
      total: _asInt(meta['total'], data.length),
      totalPages: _asInt(meta['totalPages'], 1),
    );
  }
}

class UserProfile {
  const UserProfile({
    required this.id,
    required this.email,
    required this.firstName,
    required this.lastName,
    required this.role,
    required this.organizationId,
  });

  final String id;
  final String email;
  final String firstName;
  final String lastName;
  final String role;
  final String organizationId;

  String get displayName => [firstName, lastName].where((value) => value.trim().isNotEmpty).join(' ');

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      firstName: json['firstName']?.toString() ?? '',
      lastName: json['lastName']?.toString() ?? '',
      role: json['role']?.toString() ?? '',
      organizationId: json['organizationId']?.toString() ?? '',
    );
  }
}

class AuthResult {
  const AuthResult({
    required this.accessToken,
    required this.refreshToken,
    required this.user,
  });

  final String accessToken;
  final String refreshToken;
  final UserProfile user;

  factory AuthResult.fromJson(Map<String, dynamic> json) {
    final tokens = Map<String, dynamic>.from(json['tokens'] as Map? ?? {});
    return AuthResult(
      accessToken: tokens['accessToken']?.toString() ?? '',
      refreshToken: tokens['refreshToken']?.toString() ?? '',
      user: UserProfile.fromJson(Map<String, dynamic>.from(json['user'] as Map? ?? {})),
    );
  }
}

class RecordDefinition {
  const RecordDefinition({
    required this.type,
    required this.title,
    required this.pluralTitle,
    required this.endpoint,
    required this.icon,
    required this.primaryField,
    required this.searchHint,
  });

  final EntityType type;
  final String title;
  final String pluralTitle;
  final String endpoint;
  final String icon;
  final String primaryField;
  final String searchHint;
}

const recordDefinitions = <EntityType, RecordDefinition>{
  EntityType.lead: RecordDefinition(
    type: EntityType.lead,
    title: 'Lead',
    pluralTitle: 'Lead',
    endpoint: '/leads',
    icon: 'person_search',
    primaryField: 'company',
    searchHint: 'Tìm Lead, công ty, email',
  ),
  EntityType.account: RecordDefinition(
    type: EntityType.account,
    title: 'Công ty',
    pluralTitle: 'Công ty',
    endpoint: '/accounts',
    icon: 'business',
    primaryField: 'name',
    searchHint: 'Tìm công ty',
  ),
  EntityType.contact: RecordDefinition(
    type: EntityType.contact,
    title: 'Liên hệ',
    pluralTitle: 'Liên hệ',
    endpoint: '/contacts',
    icon: 'contacts',
    primaryField: 'lastName',
    searchHint: 'Tìm liên hệ',
  ),
  EntityType.opportunity: RecordDefinition(
    type: EntityType.opportunity,
    title: 'Cơ hội',
    pluralTitle: 'Cơ hội',
    endpoint: '/opportunities',
    icon: 'trending_up',
    primaryField: 'name',
    searchHint: 'Tìm cơ hội',
  ),
  EntityType.task: RecordDefinition(
    type: EntityType.task,
    title: 'Công việc',
    pluralTitle: 'Công việc',
    endpoint: '/tasks',
    icon: 'task_alt',
    primaryField: 'subject',
    searchHint: 'Tìm công việc',
  ),
  EntityType.caseRecord: RecordDefinition(
    type: EntityType.caseRecord,
    title: 'Hỗ trợ',
    pluralTitle: 'Hỗ trợ',
    endpoint: '/cases',
    icon: 'support_agent',
    primaryField: 'subject',
    searchHint: 'Tìm yêu cầu hỗ trợ',
  ),
};

int _asInt(dynamic value, int fallback) {
  if (value is int) return value;
  if (value is num) return value.toInt();
  return int.tryParse(value?.toString() ?? '') ?? fallback;
}
