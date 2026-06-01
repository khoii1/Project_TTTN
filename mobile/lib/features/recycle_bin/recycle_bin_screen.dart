import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/models/api_models.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';

class RecycleBinScreen extends StatefulWidget {
  const RecycleBinScreen({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  State<RecycleBinScreen> createState() => _RecycleBinScreenState();
}

class _RecycleBinScreenState extends State<RecycleBinScreen> {
  EntityType? _selectedType;
  late Future<List<_TrashItem>> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<List<_TrashItem>> _load() async {
    final definitions = _trashDefinitions;
    final results = await Future.wait(
      definitions.map((definition) => widget.apiClient.list(definition, limit: 50, filters: {'deleted': 'true'})),
    );
    final items = <_TrashItem>[];
    for (var i = 0; i < definitions.length; i++) {
      for (final record in results[i].items) {
        items.add(_TrashItem(definitions[i], record));
      }
    }
    items.sort((a, b) => (b.record['deletedAt']?.toString() ?? '').compareTo(a.record['deletedAt']?.toString() ?? ''));
    return items;
  }

  void _reload() {
    final future = _load();
    setState(() {
      _future = future;
    });
  }

  Future<void> _restore(_TrashItem item) async {
    try {
      await widget.apiClient.patch('${item.definition.endpoint}/${item.record['id']}/restore', body: const {});
      if (!mounted) return;
      showCrmSnack(context, 'Đã khôi phục bản ghi');
      _reload();
    } on ApiException catch (error) {
      if (mounted) showCrmSnack(context, error.message);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(title: const Text('Thùng rác')),
      body: FutureBuilder<List<_TrashItem>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) return const LoadingView();
          if (snapshot.hasError) return ErrorBanner(message: snapshot.error.toString(), onRetry: _reload);
          final allItems = snapshot.data ?? const <_TrashItem>[];
          final items = _selectedType == null ? allItems : allItems.where((item) => item.definition.type == _selectedType).toList();
          return RefreshIndicator(
            onRefresh: () async => _reload(),
            child: ListView(
              padding: const EdgeInsets.fromLTRB(14, 10, 14, 32),
              children: [
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(label: const Text('Tất cả'), selected: _selectedType == null, onSelected: (_) => setState(() => _selectedType = null)),
                    ..._trashDefinitions.map(
                      (definition) => ChoiceChip(
                        label: Text(definition.title),
                        selected: _selectedType == definition.type,
                        onSelected: (_) => setState(() => _selectedType = definition.type),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 14),
                if (items.isEmpty)
                  const SizedBox(height: 360, child: EmptyView(message: 'Không có bản ghi trong Thùng rác'))
                else
                  ...items.map(
                    (item) => Padding(
                      padding: const EdgeInsets.only(bottom: 10),
                      child: CrmCard(
                        padding: EdgeInsets.zero,
                        child: ListTile(
                          key: ValueKey('recycleBinItem_${item.definition.type.name}_${item.title}'),
                          dense: true,
                          leading: Icon(iconFromName(item.definition.icon), color: const Color(0xFF0176D3)),
                          title: Text(item.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                          subtitle: Text('${item.definition.title} • Xóa lúc ${formatDate(item.record['deletedAt'])}\nNgười xóa: ${_deletedBy(item.record)}'),
                          isThreeLine: true,
                          trailing: TextButton(key: ValueKey('restoreButton_${item.definition.type.name}_${item.title}'), onPressed: () => _restore(item), child: const Text('Khôi phục')),
                        ),
                      ),
                    ),
                  ),
              ],
            ),
          );
        },
      ),
    );
  }

  String _deletedBy(Map<String, dynamic> record) {
    final deletedBy = record['deletedBy'];
    if (deletedBy is Map) return recordName(Map<String, dynamic>.from(deletedBy));
    final id = record['deletedById']?.toString();
    if (id == null || id.isEmpty || looksLikeUuid(id)) return 'Người dùng';
    return id;
  }
}

class _TrashItem {
  const _TrashItem(this.definition, this.record);

  final RecordDefinition definition;
  final Map<String, dynamic> record;

  String get title => definition.type == EntityType.lead ? leadName(record) : recordName(record);
}

List<RecordDefinition> get _trashDefinitions => [
      recordDefinitions[EntityType.lead]!,
      recordDefinitions[EntityType.account]!,
      recordDefinitions[EntityType.contact]!,
      recordDefinitions[EntityType.opportunity]!,
      recordDefinitions[EntityType.task]!,
      recordDefinitions[EntityType.caseRecord]!,
    ];
