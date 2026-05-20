import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/models/api_models.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';

class RecordFormScreen extends StatefulWidget {
  const RecordFormScreen({
    super.key,
    required this.apiClient,
    required this.definition,
    this.initial,
    this.relatedType,
    this.relatedId,
  });

  final ApiClient apiClient;
  final RecordDefinition definition;
  final Map<String, dynamic>? initial;
  final String? relatedType;
  final String? relatedId;

  @override
  State<RecordFormScreen> createState() => _RecordFormScreenState();
}

class _RecordFormScreenState extends State<RecordFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _controllers = <String, TextEditingController>{};
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    for (final field in _fields) {
      _controllers[field.name] = TextEditingController(
        text: widget.initial?[field.name]?.toString() ?? field.initialValue ?? '',
      );
    }
  }

  @override
  void dispose() {
    for (final controller in _controllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  List<_FieldSpec> get _fields {
    final fields = switch (widget.definition.type) {
      EntityType.lead => const [
          _FieldSpec('firstName', 'Tên'),
          _FieldSpec('lastName', 'Họ', required: true),
          _FieldSpec('company', 'Công ty', required: true),
          _FieldSpec('title', 'Chức danh'),
          _FieldSpec('email', 'Email'),
          _FieldSpec('phone', 'Số điện thoại'),
          _FieldSpec('website', 'Website'),
          _FieldSpec('status', 'Trạng thái', initialValue: 'NEW'),
          _FieldSpec('source', 'Nguồn', initialValue: 'MANUAL'),
          _FieldSpec('sourceDetail', 'Chi tiết nguồn', maxLines: 2),
          _FieldSpec('description', 'Mô tả', maxLines: 3),
        ],
      EntityType.account => const [
          _FieldSpec('name', 'Tên Account', required: true),
          _FieldSpec('type', 'Loại'),
          _FieldSpec('website', 'Website'),
          _FieldSpec('phone', 'Số điện thoại'),
          _FieldSpec('source', 'Nguồn', initialValue: 'MANUAL'),
          _FieldSpec('sourceDetail', 'Chi tiết nguồn', maxLines: 2),
          _FieldSpec('description', 'Mô tả', maxLines: 3),
        ],
      EntityType.contact => const [
          _FieldSpec('firstName', 'Tên'),
          _FieldSpec('lastName', 'Họ', required: true),
          _FieldSpec('accountId', 'Account liên quan', required: true),
          _FieldSpec('title', 'Chức danh'),
          _FieldSpec('email', 'Email'),
          _FieldSpec('phone', 'Số điện thoại'),
          _FieldSpec('source', 'Nguồn', initialValue: 'MANUAL'),
          _FieldSpec('sourceDetail', 'Chi tiết nguồn', maxLines: 2),
          _FieldSpec('description', 'Mô tả', maxLines: 3),
        ],
      EntityType.opportunity => const [
          _FieldSpec('name', 'Tên cơ hội', required: true),
          _FieldSpec('accountId', 'Account liên quan', required: true),
          _FieldSpec('contactId', 'Contact liên quan'),
          _FieldSpec('amount', 'Giá trị'),
          _FieldSpec('stage', 'Giai đoạn', initialValue: 'QUALIFY'),
          _FieldSpec('closeDate', 'Ngày chốt dự kiến YYYY-MM-DD'),
          _FieldSpec('nextStep', 'Bước tiếp theo'),
          _FieldSpec('source', 'Nguồn', initialValue: 'MANUAL'),
          _FieldSpec('sourceDetail', 'Chi tiết nguồn', maxLines: 2),
          _FieldSpec('description', 'Mô tả', maxLines: 3),
        ],
      EntityType.task => const [
          _FieldSpec('subject', 'Tiêu đề', required: true),
          _FieldSpec('dueDate', 'Hạn hoàn thành YYYY-MM-DD'),
          _FieldSpec('status', 'Trạng thái', initialValue: 'NOT_STARTED'),
          _FieldSpec('priority', 'Ưu tiên', initialValue: 'NORMAL'),
          _FieldSpec('relatedType', 'Liên quan đến', initialValue: 'LEAD'),
          _FieldSpec('relatedId', 'Bản ghi liên quan'),
          _FieldSpec('description', 'Mô tả', maxLines: 3),
        ],
      EntityType.caseRecord => const [
          _FieldSpec('subject', 'Tiêu đề', required: true),
          _FieldSpec('accountId', 'Account liên quan'),
          _FieldSpec('contactId', 'Contact liên quan'),
          _FieldSpec('status', 'Trạng thái', initialValue: 'NEW'),
          _FieldSpec('priority', 'Ưu tiên', initialValue: 'MEDIUM'),
          _FieldSpec('source', 'Nguồn', initialValue: 'MANUAL'),
          _FieldSpec('sourceDetail', 'Chi tiết nguồn', maxLines: 2),
          _FieldSpec('description', 'Mô tả', maxLines: 3),
        ],
    };

    if (widget.definition.type == EntityType.task && widget.relatedType != null && widget.relatedId != null) {
      return fields.where((field) => field.name != 'relatedType' && field.name != 'relatedId').toList();
    }
    return fields;
  }

  Future<void> _save() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _saving = true);
    try {
      final body = <String, dynamic>{};
      for (final field in _fields) {
        final createManagedField = widget.initial == null &&
            ((field.name == 'status' && (widget.definition.type == EntityType.lead || widget.definition.type == EntityType.task || widget.definition.type == EntityType.caseRecord)) ||
                (field.name == 'stage' && widget.definition.type == EntityType.opportunity));
        if (createManagedField) {
          continue;
        }
        final value = _controllers[field.name]!.text.trim();
        if (value.isNotEmpty) body[field.name] = _normalize(field.name, value);
      }
      if (widget.definition.type == EntityType.task && body['assignedToId'] == null) {
        final currentUserId = context.read<AuthController>().user?.id;
        if (currentUserId != null && currentUserId.isNotEmpty) {
          body['assignedToId'] = currentUserId;
        }
      }
      if (widget.relatedType != null && widget.relatedId != null) {
        body['relatedType'] = widget.relatedType;
        body['relatedId'] = widget.relatedId;
      }

      if (widget.initial == null) {
        await widget.apiClient.post(widget.definition.endpoint, body: body);
      } else {
        await widget.apiClient.patch('${widget.definition.endpoint}/${widget.initial!['id']}', body: body);
      }
      if (!mounted) return;
      showCrmSnack(context, widget.initial == null ? 'Đã tạo bản ghi' : 'Đã cập nhật bản ghi');
      Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (mounted) showCrmSnack(context, error.message);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  dynamic _normalize(String field, String value) {
    if (field == 'amount') return num.tryParse(value.replaceAll('.', '').replaceAll(',', '')) ?? value;
    if (field.endsWith('Date')) return DateTime.tryParse(value)?.toIso8601String() ?? value;
    return value;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(widget.initial == null ? 'Tạo ${widget.definition.title}' : 'Sửa ${widget.definition.title}')),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            CrmCard(
              child: Column(
                children: [
                  ..._fields.map(_buildField),
                  SizedBox(
                    width: double.infinity,
                    child: FilledButton.icon(
                      onPressed: _saving ? null : _save,
                      icon: _saving
                          ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.save_outlined),
                      label: const Text('Lưu'),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 12),
            const Text('Các quan hệ được chọn bằng tên bản ghi; ứng dụng không yêu cầu nhập UUID thủ công.'),
          ],
        ),
      ),
    );
  }

  Widget _buildField(_FieldSpec field) {
    final options = _enumOptions(field.name, widget.definition.type);
    if (options.isNotEmpty) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: DropdownButtonFormField<String>(
          initialValue: _controllers[field.name]!.text.isEmpty ? field.initialValue : _controllers[field.name]!.text,
          isExpanded: true,
          decoration: InputDecoration(labelText: field.label),
          items: options.map((value) => DropdownMenuItem(value: value, child: Text(labelFor(value)))).toList(),
          onChanged: (value) {
            _controllers[field.name]!.text = value ?? '';
            if (field.name == 'relatedType') {
              _controllers['relatedId']?.clear();
              setState(() {});
            }
          },
          validator: field.required ? (value) => value == null || value.isEmpty ? 'Bắt buộc' : null : null,
        ),
      );
    }

    if (field.name == 'relatedId') {
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: _GenericRelationPicker(
          apiClient: widget.apiClient,
          controller: _controllers[field.name]!,
          relatedTypeController: _controllers['relatedType']!,
        ),
      );
    }

    if (field.name == 'accountId' || field.name == 'contactId') {
      return Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: _RelationPicker(
          apiClient: widget.apiClient,
          field: field,
          controller: _controllers[field.name]!,
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: _controllers[field.name],
        maxLines: field.maxLines,
        decoration: InputDecoration(labelText: field.label),
        validator: field.required ? (value) => value == null || value.trim().isEmpty ? 'Bắt buộc' : null : null,
      ),
    );
  }
}

class _RelationPicker extends StatelessWidget {
  const _RelationPicker({
    required this.apiClient,
    required this.field,
    required this.controller,
  });

  final ApiClient apiClient;
  final _FieldSpec field;
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) {
    final definition = field.name == 'accountId' ? recordDefinitions[EntityType.account]! : recordDefinitions[EntityType.contact]!;
    return FutureBuilder<PaginatedResult>(
      future: apiClient.list(definition, limit: 100),
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return InputDecorator(decoration: InputDecoration(labelText: field.label), child: const LinearProgressIndicator());
        }
        final items = snapshot.data?.items ?? const <Map<String, dynamic>>[];
        final values = items.map((item) => item['id']?.toString() ?? '').where((id) => id.isNotEmpty).toSet();
        final current = values.contains(controller.text) ? controller.text : null;
        return DropdownButtonFormField<String>(
          initialValue: current,
          isExpanded: true,
          decoration: InputDecoration(labelText: field.label),
          items: [
            if (!field.required) const DropdownMenuItem<String>(value: '', child: Text('Không chọn')),
            ...items.map((item) => DropdownMenuItem<String>(value: item['id']?.toString(), child: Text(recordName(item), overflow: TextOverflow.ellipsis))),
          ],
          onChanged: (value) => controller.text = value ?? '',
          validator: field.required ? (value) => value == null || value.isEmpty ? 'Bắt buộc' : null : null,
        );
      },
    );
  }
}

class _GenericRelationPicker extends StatefulWidget {
  const _GenericRelationPicker({
    required this.apiClient,
    required this.controller,
    required this.relatedTypeController,
  });

  final ApiClient apiClient;
  final TextEditingController controller;
  final TextEditingController relatedTypeController;

  @override
  State<_GenericRelationPicker> createState() => _GenericRelationPickerState();
}

class _GenericRelationPickerState extends State<_GenericRelationPicker> {
  Future<PaginatedResult>? _future;
  String? _loadedType;

  Future<PaginatedResult> _load(String relatedType) {
    _loadedType = relatedType;
    return widget.apiClient.list(_definitionForRelatedType(relatedType), limit: 100);
  }

  @override
  Widget build(BuildContext context) {
    final relatedType = widget.relatedTypeController.text.isEmpty ? 'LEAD' : widget.relatedTypeController.text;
    if (_future == null || _loadedType != relatedType) {
      _future = _load(relatedType);
    }
    return FutureBuilder<PaginatedResult>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const InputDecorator(decoration: InputDecoration(labelText: 'Bản ghi liên quan'), child: LinearProgressIndicator());
        }
        final items = snapshot.data?.items ?? const <Map<String, dynamic>>[];
        final values = items.map((item) => item['id']?.toString() ?? '').where((id) => id.isNotEmpty).toSet();
        final current = values.contains(widget.controller.text) ? widget.controller.text : null;
        return DropdownButtonFormField<String>(
          initialValue: current,
          isExpanded: true,
          decoration: const InputDecoration(labelText: 'Bản ghi liên quan'),
          items: [
            const DropdownMenuItem<String>(value: '', child: Text('Không chọn')),
            ...items.map((item) => DropdownMenuItem<String>(value: item['id']?.toString(), child: Text(recordName(item), overflow: TextOverflow.ellipsis))),
          ],
          onChanged: (value) => widget.controller.text = value ?? '',
        );
      },
    );
  }
}

class _FieldSpec {
  const _FieldSpec(this.name, this.label, {this.required = false, this.maxLines = 1, this.initialValue});

  final String name;
  final String label;
  final bool required;
  final int maxLines;
  final String? initialValue;
}

List<String> _enumOptions(String field, EntityType type) {
  if (field == 'source') {
    return const ['MANUAL', 'WEBSITE', 'FACEBOOK', 'GOOGLE_ADS', 'ZALO', 'EMAIL', 'PHONE', 'REFERRAL', 'EVENT', 'IMPORT_CSV', 'CHATBOT', 'API', 'OTHER'];
  }
  if (field == 'status' && type == EntityType.lead) return const ['NEW', 'CONTACTED', 'NURTURING', 'QUALIFIED', 'UNQUALIFIED'];
  if (field == 'status' && type == EntityType.task) return const ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (field == 'status' && type == EntityType.caseRecord) return const ['NEW', 'WORKING', 'RESOLVED', 'CLOSED'];
  if (field == 'stage') return const ['QUALIFY', 'PROPOSE', 'NEGOTIATE', 'CLOSED_WON', 'CLOSED_LOST'];
  if (field == 'priority' && type == EntityType.caseRecord) return const ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];
  if (field == 'priority') return const ['LOW', 'NORMAL', 'HIGH'];
  if (field == 'relatedType') return const ['LEAD', 'ACCOUNT', 'CONTACT', 'OPPORTUNITY', 'CASE'];
  return const [];
}

RecordDefinition _definitionForRelatedType(String relatedType) {
  return switch (relatedType) {
    'ACCOUNT' => recordDefinitions[EntityType.account]!,
    'CONTACT' => recordDefinitions[EntityType.contact]!,
    'OPPORTUNITY' => recordDefinitions[EntityType.opportunity]!,
    'CASE' => recordDefinitions[EntityType.caseRecord]!,
    _ => recordDefinitions[EntityType.lead]!,
  };
}
