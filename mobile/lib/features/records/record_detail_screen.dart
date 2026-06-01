import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/models/api_models.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';
import '../search/search_screen.dart';
import 'record_form_screen.dart';

class RecordDetailScreen extends StatefulWidget {
  const RecordDetailScreen({
    super.key,
    required this.apiClient,
    required this.definition,
    required this.initialRecord,
  });

  final ApiClient apiClient;
  final RecordDefinition definition;
  final Map<String, dynamic> initialRecord;

  @override
  State<RecordDetailScreen> createState() => _RecordDetailScreenState();
}

class _RecordDetailScreenState extends State<RecordDetailScreen> {
  late Future<Map<String, dynamic>> _future;
  bool _changed = false;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<Map<String, dynamic>> _load() => widget.apiClient.detail(widget.definition, widget.initialRecord['id'].toString());

  void _reload() {
    final future = _load();
    setState(() {
      _future = future;
    });
  }

  Future<void> _edit(Map<String, dynamic> record) async {
    final ok = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => RecordFormScreen(apiClient: widget.apiClient, definition: widget.definition, initial: record)),
    );
    if (ok == true) {
      _changed = true;
      _reload();
    }
  }

  Future<void> _quickPatch(String path, Map<String, dynamic> body, String message) async {
    try {
      await widget.apiClient.patch(path, body: body);
      if (!mounted) return;
      _changed = true;
      showCrmSnack(context, message);
      _reload();
    } on ApiException catch (error) {
      if (mounted) showCrmSnack(context, error.message);
    }
  }

  Future<void> _pickAndPatch({
    required String title,
    required String field,
    required List<String> values,
    required String path,
    required String message,
    required String? current,
  }) async {
    final selected = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 12),
              child: Text(title, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            ),
            ...values.map(
              (value) => ListTile(
                key: ValueKey('picker_$value'),
                title: Text(labelFor(value)),
                trailing: current == value ? const Icon(Icons.check, color: Color(0xFF0176D3)) : null,
                onTap: () => Navigator.pop(context, value),
              ),
            ),
          ],
        ),
      ),
    );
    if (selected == null || selected == current) return;
    await _quickPatch(path, {field: selected}, message);
  }

  Future<void> _addNote() async {
    final controller = TextEditingController();
    final content = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Thêm ghi chú'),
        content: TextField(controller: controller, maxLines: 4, decoration: const InputDecoration(labelText: 'Nội dung')),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
          FilledButton(onPressed: () => Navigator.pop(context, controller.text), child: const Text('Lưu')),
        ],
      ),
    );
    controller.dispose();
    if (content == null || content.trim().isEmpty) return;
    try {
      await widget.apiClient.post('/notes', body: {
        'content': content.trim(),
        'relatedType': _relatedType(widget.definition.type),
        'relatedId': widget.initialRecord['id'],
      });
      if (!mounted) return;
      showCrmSnack(context, 'Đã thêm ghi chú');
      _reload();
    } on ApiException catch (error) {
      if (mounted) showCrmSnack(context, error.message);
    }
  }

  Future<void> _addTask() async {
    final ok = await Navigator.of(context).push<bool>(
      MaterialPageRoute(
        builder: (_) => RecordFormScreen(
          apiClient: widget.apiClient,
          definition: recordDefinitions[EntityType.task]!,
          relatedType: _relatedType(widget.definition.type),
          relatedId: widget.initialRecord['id']?.toString(),
        ),
      ),
    );
    if (ok == true) _reload();
  }

  Future<void> _convertLead(Map<String, dynamic> record) async {
    final body = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _LeadConvertSheet(apiClient: widget.apiClient, record: record),
    );
    if (body == null) return;
    try {
      await widget.apiClient.post('${widget.definition.endpoint}/${record['id']}/convert', body: body);
      if (!mounted) return;
      _changed = true;
      showCrmSnack(context, 'Đã chuyển đổi Lead');
      _reload();
    } on ApiException catch (error) {
      if (mounted) showCrmSnack(context, error.message);
    }
  }

  Future<void> _deleteRecord(Map<String, dynamic> record) async {
    final ok = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Xóa bản ghi'),
        content: const Text('Bản ghi sẽ được đưa vào Thùng rác và có thể khôi phục.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Hủy')),
          FilledButton(key: const ValueKey('confirmDeleteButton'), onPressed: () => Navigator.pop(context, true), child: const Text('Xóa')),
        ],
      ),
    );
    if (ok != true) return;
    try {
      await widget.apiClient.delete('${widget.definition.endpoint}/${record['id']}');
      if (!mounted) return;
      _changed = true;
      showCrmSnack(context, 'Đã đưa bản ghi vào Thùng rác');
      Navigator.of(context).pop(true);
    } on ApiException catch (error) {
      if (mounted) showCrmSnack(context, error.message);
    }
  }

  void _showMoreActions(Map<String, dynamic> record) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Center(child: Text('Hoạt động', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800))),
            const SizedBox(height: 12),
            _SheetAction(key: const ValueKey('addTaskButton'), icon: Icons.playlist_add_check, color: const Color(0xFF34A853), label: 'Tạo Task', onTap: () { Navigator.pop(context); _addTask(); }),
            _SheetAction(key: const ValueKey('addNoteButton'), icon: Icons.note_add, color: const Color(0xFF0176D3), label: 'Thêm ghi chú', onTap: () { Navigator.pop(context); _addNote(); }),
            _SheetAction(key: const ValueKey('recordEditButton'), icon: Icons.edit, color: const Color(0xFF00A99D), label: 'Sửa', onTap: () { Navigator.pop(context); _edit(record); }),
            if (widget.definition.type == EntityType.lead && record['status'] != 'CONVERTED')
              _SheetAction(
                key: const ValueKey('leadStatusButton'),
                icon: Icons.verified,
                color: const Color(0xFF2EAA58),
                label: 'Đổi trạng thái Lead',
                onTap: () {
                  Navigator.pop(context);
                  _pickAndPatch(
                    title: 'Trạng thái Lead',
                    field: 'status',
                    values: const ['NEW', 'CONTACTED', 'NURTURING', 'QUALIFIED', 'UNQUALIFIED'],
                    path: '/leads/${record['id']}/status',
                    message: 'Đã cập nhật trạng thái Lead',
                    current: record['status']?.toString(),
                  );
                },
              ),
            if (widget.definition.type == EntityType.lead && record['status'] != 'CONVERTED')
              _SheetAction(key: const ValueKey('leadConvertButton'), icon: Icons.call_split, color: const Color(0xFFFF5A36), label: 'Chuyển đổi Lead', onTap: () { Navigator.pop(context); _convertLead(record); }),
            if (widget.definition.type == EntityType.opportunity)
              _SheetAction(
                key: const ValueKey('opportunityStageButton'),
                icon: Icons.workspace_premium,
                color: const Color(0xFFFF5A36),
                label: 'Đổi giai đoạn',
                onTap: () {
                  Navigator.pop(context);
                  _pickAndPatch(
                    title: 'Giai đoạn cơ hội',
                    field: 'stage',
                    values: const ['QUALIFY', 'PROPOSE', 'NEGOTIATE', 'CLOSED_WON', 'CLOSED_LOST'],
                    path: '/opportunities/${record['id']}/stage',
                    message: 'Đã cập nhật giai đoạn',
                    current: record['stage']?.toString(),
                  );
                },
              ),
            if (widget.definition.type == EntityType.task && record['status'] != 'COMPLETED')
              _SheetAction(key: const ValueKey('taskCompleteButton'), icon: Icons.task_alt, color: const Color(0xFF34A853), label: 'Hoàn thành Task', onTap: () { Navigator.pop(context); _quickPatch('/tasks/${record['id']}/complete', {'status': 'COMPLETED'}, 'Đã hoàn thành Task'); }),
            if (widget.definition.type == EntityType.caseRecord)
              _SheetAction(
                key: const ValueKey('caseStatusButton'),
                icon: Icons.lock_outline,
                color: const Color(0xFF8A98A8),
                label: 'Đổi trạng thái Case',
                onTap: () {
                  Navigator.pop(context);
                  _pickAndPatch(
                    title: 'Trạng thái Case',
                    field: 'status',
                    values: const ['NEW', 'WORKING', 'RESOLVED', 'CLOSED'],
                    path: '/cases/${record['id']}/status',
                    message: 'Đã cập nhật trạng thái Case',
                    current: record['status']?.toString(),
                  );
                },
              ),
            _SheetAction(key: const ValueKey('recordDeleteButton'), icon: Icons.delete_outline, color: const Color(0xFFFF4F8B), label: 'Xóa', onTap: () { Navigator.pop(context); _deleteRecord(record); }),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: FutureBuilder<Map<String, dynamic>>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState == ConnectionState.waiting) return const LoadingView();
            if (snapshot.hasError) return ErrorBanner(message: snapshot.error.toString(), onRetry: _reload);
            final record = snapshot.data!;
            final title = widget.definition.type == EntityType.lead ? leadName(record) : recordName(record);
            return ListView(
              padding: EdgeInsets.zero,
              children: [
                _DetailTopBar(
                  onBack: () => Navigator.of(context).pop(_changed),
                  onSearch: () => Navigator.of(context).push(MaterialPageRoute(builder: (_) => SearchScreen(apiClient: widget.apiClient))),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
                  child: Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.black)),
                ),
                const Divider(height: 3, thickness: 3, color: Color(0xFF0176D3)),
                _QuickActions(onNote: _addNote, onTask: _addTask, onMore: () => _showMoreActions(record)),
                _IdentityBlock(definition: widget.definition, record: record, title: title),
                _FieldTable(type: widget.definition.type, record: record),
                if (widget.definition.type == EntityType.lead && record['status'] == 'CONVERTED') _ConvertedRecords(apiClient: widget.apiClient, record: record),
                _ActivityPanel(apiClient: widget.apiClient, definition: widget.definition, record: record),
                const SizedBox(height: 28),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _DetailTopBar extends StatelessWidget {
  const _DetailTopBar({required this.onBack, required this.onSearch});
  final VoidCallback onBack;
  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(8, 12, 16, 4),
      child: Row(
        children: [
          IconButton(key: const ValueKey('recordDetailBackButton'), onPressed: onBack, icon: const Icon(Icons.chevron_left, color: Color(0xFF0176D3), size: 34)),
          const Spacer(),
          _HeaderIcon(key: const ValueKey('recordShareButton'), icon: Icons.ios_share, message: 'Chia sẻ sẽ được bổ sung sau'),
          _HeaderIcon(key: const ValueKey('recordFavoriteButton'), icon: Icons.star_border, message: 'Yêu thích sẽ được bổ sung sau'),
          _HeaderIcon(key: const ValueKey('recordSearchButton'), icon: Icons.search, onTap: onSearch),
          _HeaderIcon(key: const ValueKey('recordNotificationButton'), icon: Icons.notifications, message: 'Thông báo sẽ được bổ sung sau'),
        ],
      ),
    );
  }
}

class _HeaderIcon extends StatelessWidget {
  const _HeaderIcon({super.key, required this.icon, this.onTap, this.message});
  final IconData icon;
  final VoidCallback? onTap;
  final String? message;

  @override
  Widget build(BuildContext context) => IconButton(
        visualDensity: VisualDensity.compact,
        tooltip: message,
        onPressed: onTap ?? () => showCrmSnack(context, message ?? 'Chức năng đang được phát triển'),
        icon: Icon(icon, color: const Color(0xFF0176D3), size: 23),
      );
}

class _QuickActions extends StatelessWidget {
  const _QuickActions({required this.onNote, required this.onTask, required this.onMore});
  final VoidCallback onNote;
  final VoidCallback onTask;
  final VoidCallback onMore;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 16, 16, 14),
      decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFD0D0D0)))),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _QuickAction(key: ValueKey('quickAddNoteButton'), icon: Icons.note_add, color: Color(0xFF0176D3), label: 'Ghi chú', onTap: onNote),
          _QuickAction(key: ValueKey('quickAddTaskButton'), icon: Icons.playlist_add_check, color: Color(0xFF34A853), label: 'Task', onTap: onTask),
          _QuickAction(key: ValueKey('recordDetailMoreButton'), icon: Icons.more_horiz, color: Color(0xFF8A98A8), label: 'Thêm', onTap: onMore),
        ],
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  const _QuickAction({super.key, required this.icon, required this.color, required this.label, required this.onTap});
  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(36),
        child: Column(
          children: [
            CircleAvatar(radius: 24, backgroundColor: color, child: Icon(icon, color: Colors.white, size: 23)),
            const SizedBox(height: 6),
            Text(label, style: const TextStyle(fontSize: 13, color: Color(0xFF444444))),
          ],
        ),
      );
}

class _IdentityBlock extends StatelessWidget {
  const _IdentityBlock({required this.definition, required this.record, required this.title});
  final RecordDefinition definition;
  final Map<String, dynamic> record;
  final String title;

  @override
  Widget build(BuildContext context) => Container(
        color: const Color(0xFFF2F2F2),
        padding: const EdgeInsets.all(18),
        child: Row(
          children: [
            Container(
              width: 56,
              height: 56,
              decoration: BoxDecoration(color: _entityColor(definition.type), borderRadius: BorderRadius.circular(6)),
              child: Icon(iconFromName(definition.icon), color: Colors.white, size: 32),
            ),
            const SizedBox(width: 20),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(definition.title, style: const TextStyle(fontSize: 14, color: Color(0xFF555555))),
                  Text(title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800, color: Colors.black)),
                ],
              ),
            ),
          ],
        ),
      );
}

class _FieldTable extends StatelessWidget {
  const _FieldTable({required this.type, required this.record});
  final EntityType type;
  final Map<String, dynamic> record;

  @override
  Widget build(BuildContext context) => Column(children: _fields(type, record).map((field) => _FieldRow(label: field.$1, value: field.$2, link: field.$3)).toList());

  List<(String, String, bool)> _fields(EntityType type, Map<String, dynamic> record) {
    final items = <(String, String, bool)>[];
    void add(String label, dynamic value, {bool link = false, bool date = false, bool currency = false, bool enumLabel = false}) {
      if (value == null || value.toString().isEmpty || looksLikeUuid(value.toString())) return;
      final text = currency ? formatCurrency(value) : date ? formatDate(value) : enumLabel ? labelFor(value.toString()) : value.toString();
      items.add((label, text, link));
    }

    add('Điện thoại', record['phone'], link: true);
    add('Website', record['website'], link: true);
    add('Email', record['email'], link: true);
    add('Account', record['account']?['name']);
    add('Contact', record['contact'] == null ? null : recordName(Map<String, dynamic>.from(record['contact'] as Map)));
    add('Giá trị', record['amount'], currency: true);
    add('Giai đoạn', record['stage'], enumLabel: true);
    add('Trạng thái', record['status'], enumLabel: true);
    add('Ưu tiên', record['priority'], enumLabel: true);
    add('Nguồn', record['source'], enumLabel: true);
    add('Chi tiết nguồn', record['sourceDetail']);
    add('Hạn hoàn thành', record['dueDate'], date: true);
    add('Người hoàn thành', _actorLabel(record['completedBy']));
    add('Hoàn thành lúc', record['completedAt'], date: true);
    add('Người đóng', _actorLabel(record['closedBy']));
    add('Đóng lúc', record['closedAt'], date: true);
    add('Mô tả', record['description']);
    add('Ngày tạo', record['createdAt'], date: true);
    return items.take(10).toList();
  }

  String? _actorLabel(dynamic value) {
    if (value is Map) return recordName(Map<String, dynamic>.from(value));
    final text = value?.toString();
    if (text == null || looksLikeUuid(text)) return null;
    return text;
  }
}

class _FieldRow extends StatelessWidget {
  const _FieldRow({required this.label, required this.value, required this.link});
  final String label;
  final String value;
  final bool link;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(24, 16, 24, 16),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFD0D0D0)))),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(width: 120, child: Text(label, style: const TextStyle(fontSize: 15, color: Color(0xFF444444)))),
            Expanded(child: Text(value, style: TextStyle(fontSize: 15, color: link ? const Color(0xFF0176D3) : Colors.black))),
          ],
        ),
      );
}

class _ConvertedRecords extends StatelessWidget {
  const _ConvertedRecords({required this.apiClient, required this.record});
  final ApiClient apiClient;
  final Map<String, dynamic> record;

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<_ConvertedItem>>(
      future: _load(),
      builder: (context, snapshot) {
        if (!snapshot.hasData || snapshot.data!.isEmpty) return const SizedBox.shrink();
        return Container(
          color: const Color(0xFFF4F2F2),
          padding: const EdgeInsets.fromLTRB(24, 18, 24, 18),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('Bản ghi đã chuyển đổi', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800)),
              const SizedBox(height: 8),
              ...snapshot.data!.map((item) => ListTile(
                    contentPadding: EdgeInsets.zero,
                    leading: Icon(iconFromName(item.definition.icon), color: const Color(0xFF0176D3)),
                    title: Text(item.name),
                    subtitle: Text(item.definition.title),
                  )),
            ],
          ),
        );
      },
    );
  }

  Future<List<_ConvertedItem>> _load() async {
    final specs = [
      (recordDefinitions[EntityType.account]!, record['convertedAccountId']),
      (recordDefinitions[EntityType.contact]!, record['convertedContactId']),
      (recordDefinitions[EntityType.opportunity]!, record['convertedOpportunityId']),
    ];
    final items = <_ConvertedItem>[];
    for (final spec in specs) {
      final id = spec.$2?.toString();
      if (id == null || id.isEmpty) continue;
      try {
        final detail = await apiClient.detail(spec.$1, id);
        items.add(_ConvertedItem(spec.$1, recordName(detail)));
      } catch (_) {}
    }
    return items;
  }
}

class _ConvertedItem {
  const _ConvertedItem(this.definition, this.name);
  final RecordDefinition definition;
  final String name;
}

class _ActivityPanel extends StatelessWidget {
  const _ActivityPanel({required this.apiClient, required this.definition, required this.record});
  final ApiClient apiClient;
  final RecordDefinition definition;
  final Map<String, dynamic> record;

  @override
  Widget build(BuildContext context) {
    final relatedType = _relatedType(definition.type);
    final id = record['id']?.toString();
    return Container(
      margin: const EdgeInsets.only(top: 34),
      padding: const EdgeInsets.fromLTRB(24, 20, 24, 24),
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [BoxShadow(color: Color(0x22000000), blurRadius: 16, offset: Offset(0, -4))],
        borderRadius: BorderRadius.vertical(top: Radius.circular(18)),
      ),
      child: FutureBuilder<List<dynamic>>(
        future: Future.wait([
          apiClient.get('/notes', query: {'relatedType': relatedType, 'relatedId': id, 'limit': 5}),
          apiClient.get('/tasks', query: {'relatedType': relatedType, 'relatedId': id, 'limit': 5}),
        ]),
        builder: (context, snapshot) {
          final notes = snapshot.hasData ? _extractList(snapshot.data![0]) : const [];
          final tasks = snapshot.hasData ? _extractList(snapshot.data![1]) : const [];
          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Center(child: Container(width: 72, height: 7, decoration: BoxDecoration(color: Colors.grey[500], borderRadius: BorderRadius.circular(99)))),
              const SizedBox(height: 22),
              const Text('Hoạt động gần đây', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF444444))),
              const SizedBox(height: 12),
              if (snapshot.connectionState == ConnectionState.waiting) const LinearProgressIndicator(),
              if (snapshot.hasData && notes.isEmpty && tasks.isEmpty) const Text('Chưa có note/task liên quan', style: TextStyle(fontSize: 15, color: Colors.grey)),
              ...notes.map((raw) {
                final note = Map<String, dynamic>.from(raw as Map);
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.sticky_note_2_outlined, color: Color(0xFF0176D3)),
                  title: Text(note['content']?.toString() ?? 'Ghi chú', maxLines: 2, overflow: TextOverflow.ellipsis),
                  subtitle: Text(formatDate(note['createdAt'])),
                );
              }),
              ...tasks.map((raw) {
                final task = Map<String, dynamic>.from(raw as Map);
                return ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.task_alt, color: Color(0xFF2EAA58)),
                  title: Text(task['subject']?.toString() ?? 'Task', maxLines: 1, overflow: TextOverflow.ellipsis),
                  subtitle: Text('${labelFor(task['status']?.toString())} • ${labelFor(task['priority']?.toString())}'),
                );
              }),
            ],
          );
        },
      ),
    );
  }

  List<dynamic> _extractList(dynamic json) {
    if (json is List) return json;
    if (json is Map && json['data'] is List) return json['data'] as List;
    return const [];
  }
}

class _LeadConvertSheet extends StatefulWidget {
  const _LeadConvertSheet({required this.apiClient, required this.record});
  final ApiClient apiClient;
  final Map<String, dynamic> record;

  @override
  State<_LeadConvertSheet> createState() => _LeadConvertSheetState();
}

class _LeadConvertSheetState extends State<_LeadConvertSheet> {
  String accountMode = 'CREATE_NEW';
  String contactMode = 'CREATE_NEW';
  String opportunityMode = 'CREATE_NEW';
  String? accountId;
  String? contactId;
  String? opportunityId;
  late final TextEditingController opportunityName;
  late Future<Map<String, dynamic>> _suggestions;

  @override
  void initState() {
    super.initState();
    opportunityName = TextEditingController(text: '${widget.record['company'] ?? leadName(widget.record)} - CRM');
    _suggestions = widget.apiClient.get('/leads/${widget.record['id']}/conversion-suggestions').then((value) => Map<String, dynamic>.from(value as Map));
  }

  @override
  void dispose() {
    opportunityName.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: EdgeInsets.only(left: 20, right: 20, bottom: MediaQuery.of(context).viewInsets.bottom + 20),
        child: FutureBuilder<Map<String, dynamic>>(
          future: _suggestions,
          builder: (context, snapshot) {
            final suggestions = snapshot.data ?? const <String, dynamic>{};
            final accounts = _list(suggestions['accounts']);
            final contacts = _list(suggestions['contacts']);
            final opportunities = _list(suggestions['opportunities']);
            return ListView(
              shrinkWrap: true,
              children: [
                Text('Chuyển đổi Lead', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 12),
                if (snapshot.connectionState == ConnectionState.waiting) const LinearProgressIndicator(),
                _ModePicker(
                  title: 'Công ty',
                  mode: accountMode,
                  modes: const ['CREATE_NEW', 'USE_EXISTING'],
                  items: accounts,
                  selectedId: accountId,
                  onModeChanged: (value) => setState(() {
                    accountMode = value;
                    accountId = null;
                  }),
                  onIdChanged: (value) => setState(() => accountId = value),
                ),
                _ModePicker(
                  title: 'Liên hệ',
                  mode: contactMode,
                  modes: const ['CREATE_NEW', 'USE_EXISTING'],
                  items: contacts,
                  selectedId: contactId,
                  onModeChanged: (value) => setState(() {
                    contactMode = value;
                    contactId = null;
                  }),
                  onIdChanged: (value) => setState(() => contactId = value),
                ),
                _ModePicker(
                  title: 'Cơ hội',
                  mode: opportunityMode,
                  modes: const ['CREATE_NEW', 'USE_EXISTING', 'DO_NOT_CREATE'],
                  items: opportunities,
                  selectedId: opportunityId,
                  onModeChanged: (value) => setState(() {
                    opportunityMode = value;
                    opportunityId = null;
                  }),
                  onIdChanged: (value) => setState(() => opportunityId = value),
                ),
                if (opportunityMode == 'CREATE_NEW')
                  TextField(controller: opportunityName, decoration: const InputDecoration(labelText: 'Tên cơ hội')),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: _canSubmit
                      ? () => Navigator.pop(context, {
                            'accountMode': accountMode,
                            if (accountMode == 'USE_EXISTING') 'accountId': accountId,
                            'contactMode': contactMode,
                            if (contactMode == 'USE_EXISTING') 'contactId': contactId,
                            'opportunityMode': opportunityMode,
                            if (opportunityMode == 'USE_EXISTING') 'opportunityId': opportunityId,
                            if (opportunityMode == 'CREATE_NEW') 'opportunityName': opportunityName.text.trim(),
                          })
                      : null,
                  icon: const Icon(Icons.call_split),
                  label: const Text('Chuyển đổi'),
                ),
              ],
            );
          },
        ),
      ),
    );
  }

  bool get _canSubmit {
    if (accountMode == 'USE_EXISTING' && (accountId == null || accountId!.isEmpty)) return false;
    if (contactMode == 'USE_EXISTING' && (contactId == null || contactId!.isEmpty)) return false;
    if (opportunityMode == 'USE_EXISTING' && (opportunityId == null || opportunityId!.isEmpty)) return false;
    return true;
  }

  List<Map<String, dynamic>> _list(dynamic value) {
    if (value is List) return value.whereType<Map>().map((item) => Map<String, dynamic>.from(item)).toList();
    return const [];
  }
}

class _ModePicker extends StatelessWidget {
  const _ModePicker({
    required this.title,
    required this.mode,
    required this.modes,
    required this.items,
    required this.selectedId,
    required this.onModeChanged,
    required this.onIdChanged,
  });

  final String title;
  final String mode;
  final List<String> modes;
  final List<Map<String, dynamic>> items;
  final String? selectedId;
  final ValueChanged<String> onModeChanged;
  final ValueChanged<String?> onIdChanged;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 12),
      child: Column(
        children: [
          DropdownButtonFormField<String>(
            initialValue: mode,
            isExpanded: true,
            decoration: InputDecoration(labelText: 'Cách xử lý $title'),
            items: modes.map((value) => DropdownMenuItem(value: value, child: Text(_modeLabel(value)))).toList(),
            onChanged: (value) {
              if (value != null) onModeChanged(value);
            },
          ),
          if (mode == 'USE_EXISTING') ...[
            const SizedBox(height: 8),
            DropdownButtonFormField<String>(
              initialValue: items.any((item) => item['id']?.toString() == selectedId) ? selectedId : null,
              isExpanded: true,
              decoration: InputDecoration(labelText: 'Chọn $title có sẵn'),
              items: items
                  .map((item) => DropdownMenuItem<String>(value: item['id']?.toString(), child: Text(recordName(item), overflow: TextOverflow.ellipsis)))
                  .toList(),
              onChanged: onIdChanged,
            ),
            if (items.isEmpty) const Align(alignment: Alignment.centerLeft, child: Text('Chưa có gợi ý phù hợp')),
          ],
        ],
      ),
    );
  }

  String _modeLabel(String value) {
    return switch (value) {
      'CREATE_NEW' => 'Tạo mới',
      'USE_EXISTING' => 'Dùng bản ghi có sẵn',
      'DO_NOT_CREATE' => 'Không tạo',
      _ => value,
    };
  }
}

class _SheetAction extends StatelessWidget {
  const _SheetAction({super.key, required this.icon, required this.color, required this.label, required this.onTap});
  final IconData icon;
  final Color color;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.fromLTRB(24, 14, 24, 14),
          decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFE1E1E1)))),
          child: Row(
            children: [
              CircleAvatar(radius: 22, backgroundColor: color, child: Icon(icon, color: Colors.white, size: 20)),
              const SizedBox(width: 14),
              Expanded(child: Text(label, style: const TextStyle(fontSize: 16, color: Color(0xFF444444), fontWeight: FontWeight.w600))),
            ],
          ),
        ),
      );
}

Color _entityColor(EntityType type) {
  return switch (type) {
    EntityType.lead => const Color(0xFF00A1A7),
    EntityType.contact => const Color(0xFFA100D6),
    EntityType.account => const Color(0xFF5867E8),
    EntityType.opportunity => const Color(0xFFFF5A36),
    EntityType.task => const Color(0xFF34A853),
    EntityType.caseRecord => const Color(0xFF1686B0),
  };
}

String _relatedType(EntityType type) {
  return switch (type) {
    EntityType.lead => 'LEAD',
    EntityType.account => 'ACCOUNT',
    EntityType.contact => 'CONTACT',
    EntityType.opportunity => 'OPPORTUNITY',
    EntityType.caseRecord => 'CASE',
    EntityType.task => 'TASK',
  };
}
