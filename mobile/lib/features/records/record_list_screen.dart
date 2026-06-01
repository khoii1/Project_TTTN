import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/models/api_models.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';
import 'record_detail_screen.dart';
import 'record_form_screen.dart';

class RecordListScreen extends StatefulWidget {
  const RecordListScreen({
    super.key,
    required this.apiClient,
    required this.definition,
    this.standalone = false,
  });

  final ApiClient apiClient;
  final RecordDefinition definition;
  final bool standalone;

  @override
  State<RecordListScreen> createState() => _RecordListScreenState();
}

class _RecordListScreenState extends State<RecordListScreen> {
  final _searchController = TextEditingController();
  final _searchFocus = FocusNode();
  Timer? _debounce;
  late Future<PaginatedResult> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _searchController.dispose();
    _searchFocus.dispose();
    super.dispose();
  }

  Future<PaginatedResult> _load() => widget.apiClient.list(widget.definition, search: _searchController.text);

  void _reload() {
    final future = _load();
    setState(() {
      _future = future;
    });
  }

  void _onSearchChanged(String _) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), _reload);
  }

  Future<void> _create() async {
    final created = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => RecordFormScreen(apiClient: widget.apiClient, definition: widget.definition)),
    );
    if (created == true) _reload();
  }

  Future<void> _open(Map<String, dynamic> record) async {
    final changed = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => RecordDetailScreen(apiClient: widget.apiClient, definition: widget.definition, initialRecord: record)),
    );
    if (changed == true) _reload();
  }

  void _showListViews() {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => SafeArea(
        child: ListView(
          shrinkWrap: true,
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
              child: Text('Tất cả danh sách', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
            ),
            ..._listViews(widget.definition.type).map(
              (name) => _PlainRow(title: name, icon: Icons.format_list_bulleted, onTap: () => Navigator.pop(context)),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = _pluralTitle(widget.definition.type);
    final content = SafeArea(
      child: Column(
        children: [
          _ListHeader(
            type: widget.definition.type,
            title: title,
            searchHint: 'Tìm kiếm $title',
            searchController: _searchController,
            searchFocus: _searchFocus,
            onSearchChanged: _onSearchChanged,
            onCreate: _create,
            onBack: widget.standalone ? () => Navigator.of(context).pop() : null,
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: () async => _reload(),
              child: FutureBuilder<PaginatedResult>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) return const LoadingView();
                  if (snapshot.hasError) return ErrorBanner(message: snapshot.error.toString(), onRetry: _reload);
                  final result = snapshot.data!;
                  return ListView(
                    padding: EdgeInsets.zero,
                    children: [
                      _ListViewChooser(type: widget.definition.type, onAll: _showListViews),
                      const _SectionGap(),
                      Padding(
                        padding: const EdgeInsets.fromLTRB(20, 18, 20, 8),
                        child: Text('Gần đây $title', style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF444444))),
                      ),
                      if (result.items.isEmpty)
                        EmptyView(message: 'Chưa có $title')
                      else
                        ...result.items.take(10).map((record) => _RecentRecordRow(definition: widget.definition, record: record, onTap: () => _open(record))),
                      const SizedBox(height: 88),
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
    if (!widget.standalone) return content;
    return Scaffold(
      backgroundColor: Colors.white,
      body: content,
    );
  }
}

class _ListHeader extends StatelessWidget {
  const _ListHeader({
    required this.type,
    required this.title,
    required this.searchHint,
    required this.searchController,
    required this.searchFocus,
    required this.onSearchChanged,
    required this.onCreate,
    this.onBack,
  });

  final EntityType type;
  final String title;
  final String searchHint;
  final TextEditingController searchController;
  final FocusNode searchFocus;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onCreate;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 4),
          child: Row(
            children: [
              if (onBack == null)
                const CircleAvatar(radius: 20, backgroundColor: Color(0xFF8AA0B4), child: Icon(Icons.person, color: Colors.white, size: 24))
              else
                IconButton(key: const ValueKey('recordListBackButton'), onPressed: onBack, icon: const Icon(Icons.chevron_left, color: Color(0xFF0176D3), size: 32)),
              const Spacer(),
              _HeaderIcon(icon: Icons.ios_share, message: 'Chia sẻ sẽ được bổ sung sau'),
              _HeaderIcon(icon: Icons.star_border, message: 'Yêu thích sẽ được bổ sung sau'),
              _HeaderIcon(icon: Icons.search, onTap: () => searchFocus.requestFocus()),
              _HeaderIcon(icon: Icons.notifications, message: 'Thông báo sẽ được bổ sung sau'),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 10, 20, 12),
          child: Row(
            children: [
              Expanded(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 24, fontWeight: FontWeight.w800, color: Colors.black))),
              FilledButton.icon(key: ValueKey('${type.name}CreateButton'), onPressed: onCreate, icon: const Icon(Icons.add, size: 18), label: const Text('Mới')),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: TextField(
            key: ValueKey('${type.name}SearchField'),
            controller: searchController,
            focusNode: searchFocus,
            onChanged: onSearchChanged,
            style: const TextStyle(fontSize: 15),
            decoration: InputDecoration(
              hintText: searchHint,
              hintStyle: const TextStyle(fontSize: 15, color: Color(0xFF666666)),
              prefixIcon: const Icon(Icons.search, size: 22, color: Color(0xFF7D7F86)),
              suffixIcon: searchController.text.isEmpty
                  ? null
                  : IconButton(
                      onPressed: () {
                        searchController.clear();
                        onSearchChanged('');
                      },
                      icon: const Icon(Icons.clear),
                    ),
            ),
          ),
        ),
        const Divider(height: 2, thickness: 2, color: Color(0xFF0176D3)),
      ],
    );
  }
}

class _HeaderIcon extends StatelessWidget {
  const _HeaderIcon({required this.icon, this.onTap, this.message});

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

class _ListViewChooser extends StatelessWidget {
  const _ListViewChooser({required this.type, required this.onAll});

  final EntityType type;
  final VoidCallback onAll;

  @override
  Widget build(BuildContext context) {
    final views = _listViews(type);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.fromLTRB(20, 16, 20, 8),
          child: Text('Danh sách', style: TextStyle(fontSize: 17, fontWeight: FontWeight.w800, color: Color(0xFF444444))),
        ),
        _PlainRow(title: views[0], icon: Icons.format_list_bulleted, onTap: () => showCrmSnack(context, 'Bộ lọc danh sách sẽ được bổ sung sau')),
        _PlainRow(title: views[1], icon: Icons.format_list_bulleted, onTap: () => showCrmSnack(context, 'Bộ lọc danh sách sẽ được bổ sung sau')),
        InkWell(
          onTap: onAll,
          child: const Padding(
            padding: EdgeInsets.fromLTRB(20, 14, 20, 14),
            child: Row(
              children: [
                Expanded(child: Text('Tất cả danh sách', style: TextStyle(fontSize: 16))),
                Icon(Icons.chevron_right, size: 28, color: Colors.grey),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _PlainRow extends StatelessWidget {
  const _PlainRow({required this.title, required this.icon, required this.onTap});

  final String title;
  final IconData icon;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 13, 20, 13),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFD9D9D9)))),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF163B66), size: 23),
            const SizedBox(width: 14),
            Expanded(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 16))),
          ],
        ),
      ),
    );
  }
}

class _SectionGap extends StatelessWidget {
  const _SectionGap();

  @override
  Widget build(BuildContext context) => Container(height: 12, color: const Color(0xFFF4F2F2));
}

class _RecentRecordRow extends StatelessWidget {
  const _RecentRecordRow({required this.definition, required this.record, required this.onTap});

  final RecordDefinition definition;
  final Map<String, dynamic> record;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final title = definition.type == EntityType.lead ? leadName(record) : recordName(record);
    return InkWell(
      key: ValueKey('${definition.type.name}Record_$title'),
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(20, 12, 20, 13),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFE1E1E1)))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 17, color: Colors.black, fontWeight: FontWeight.w600)),
            const SizedBox(height: 3),
            Text(_subtitle(definition.type, record), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: Color(0xFF555555))),
          ],
        ),
      ),
    );
  }

  String _subtitle(EntityType type, Map<String, dynamic> record) {
    if (type == EntityType.account) return 'SĐT: ${record['phone'] ?? 'Chưa có'}';
    if (type == EntityType.contact) return 'Công ty: ${record['account']?['name'] ?? record['email'] ?? 'Chưa có'}';
    if (type == EntityType.opportunity) return 'Công ty: ${record['account']?['name'] ?? formatCurrency(record['amount'])}';
    if (type == EntityType.task) return '${labelFor(record['status']?.toString())} • ${labelFor(record['priority']?.toString())}';
    if (type == EntityType.caseRecord) return '${labelFor(record['status']?.toString())} • ${labelFor(record['priority']?.toString())}';
    return subtitleFor(record);
  }
}

String _pluralTitle(EntityType type) {
  return switch (type) {
    EntityType.lead => 'Lead',
    EntityType.contact => 'Liên hệ',
    EntityType.account => 'Công ty',
    EntityType.opportunity => 'Cơ hội',
    EntityType.task => 'Công việc',
    EntityType.caseRecord => 'Hỗ trợ',
  };
}

List<String> _listViews(EntityType type) {
  return switch (type) {
    EntityType.lead => const ['Lead hôm nay', 'Lead của tôi', 'Tất cả Lead', 'Đã xem gần đây'],
    EntityType.contact => const ['Tất cả liên hệ', 'Liên hệ của tôi', 'Mới trong tháng', 'Đã xem gần đây'],
    EntityType.account => const ['Tất cả công ty', 'Công ty của tôi', 'Mới tuần này', 'Đã xem gần đây'],
    EntityType.opportunity => const ['Tất cả cơ hội', 'Sắp chốt', 'Cơ hội của tôi', 'Đã xem gần đây'],
    EntityType.task => const ['Tất cả công việc', 'Việc đang mở', 'Đã hoàn thành', 'Đã xem gần đây'],
    EntityType.caseRecord => const ['Tất cả hỗ trợ', 'Đang mở', 'Ưu tiên cao', 'Đã xem gần đây'],
  };
}
