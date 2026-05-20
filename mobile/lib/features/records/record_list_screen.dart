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
    super.dispose();
  }

  Future<PaginatedResult> _load() => widget.apiClient.list(widget.definition, search: _searchController.text);

  void _reload() {
    setState(() => _future = _load());
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
              padding: const EdgeInsets.fromLTRB(24, 8, 24, 16),
              child: Text('Tất Cả Danh Sách', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800)),
            ),
            ..._listViews(widget.definition.type).map((name) => _PlainRow(title: name, icon: Icons.format_list_bulleted, onTap: () => Navigator.pop(context))),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final title = _pluralTitle(widget.definition.type);
    return SafeArea(
      child: Column(
        children: [
          _ListHeader(
            title: title,
            searchHint: 'Tìm Kiếm $title',
            searchController: _searchController,
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
                        padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
                        child: Text('Gần Đây $title', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF444444))),
                      ),
                      if (result.items.isEmpty)
                        EmptyView(message: 'Chưa có $title')
                      else
                        ...result.items.take(10).map((record) => _RecentRecordRow(definition: widget.definition, record: record, onTap: () => _open(record))),
                      const SizedBox(height: 96),
                    ],
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ListHeader extends StatelessWidget {
  const _ListHeader({
    required this.title,
    required this.searchHint,
    required this.searchController,
    required this.onSearchChanged,
    required this.onCreate,
    this.onBack,
  });

  final String title;
  final String searchHint;
  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;
  final VoidCallback onCreate;
  final VoidCallback? onBack;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
          child: Row(
            children: [
              if (onBack == null)
                const CircleAvatar(radius: 26, backgroundColor: Color(0xFF8AA0B4), child: Icon(Icons.person, color: Colors.white, size: 32))
              else
                IconButton(onPressed: onBack, icon: const Icon(Icons.chevron_left, color: Color(0xFF0176D3), size: 42)),
              const Spacer(),
              const _HeaderIcon(icon: Icons.ios_share),
              const _HeaderIcon(icon: Icons.star_border),
              const _HeaderIcon(icon: Icons.search),
              const _HeaderIcon(icon: Icons.notifications),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 28, 24, 20),
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(child: Text(title, style: const TextStyle(fontSize: 30, fontWeight: FontWeight.w900, color: Colors.black))),
              TextButton(onPressed: onCreate, child: const Text('Mới', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700))),
            ],
          ),
        ),
        Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 24),
          child: TextField(
            controller: searchController,
            onChanged: onSearchChanged,
            style: const TextStyle(fontSize: 18),
            decoration: InputDecoration(
              hintText: searchHint,
              hintStyle: const TextStyle(fontSize: 18, color: Color(0xFF666666)),
              prefixIcon: const Icon(Icons.search, size: 28, color: Color(0xFF7D7F86)),
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
        const Divider(height: 3, thickness: 3, color: Color(0xFF0176D3)),
      ],
    );
  }
}

class _HeaderIcon extends StatelessWidget {
  const _HeaderIcon({required this.icon});

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(left: 22),
      child: Icon(icon, color: const Color(0xFF0176D3), size: 34),
    );
  }
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
          padding: EdgeInsets.fromLTRB(24, 24, 24, 18),
          child: Text('Danh sách', style: TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Color(0xFF444444))),
        ),
        _PlainRow(title: views[0], icon: Icons.format_list_bulleted, onTap: () {}),
        _PlainRow(title: views[1], icon: Icons.format_list_bulleted, onTap: () {}),
        InkWell(
          onTap: onAll,
          child: const Padding(
            padding: EdgeInsets.fromLTRB(24, 22, 24, 22),
            child: Row(
              children: [
                Expanded(child: Text('Tất Cả Danh Sách', style: TextStyle(fontSize: 20))),
                Icon(Icons.chevron_right, size: 36, color: Colors.grey),
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
        padding: const EdgeInsets.fromLTRB(24, 22, 24, 22),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFD9D9D9)))),
        child: Row(
          children: [
            Icon(icon, color: const Color(0xFF163B66), size: 30),
            const SizedBox(width: 20),
            Expanded(child: Text(title, style: const TextStyle(fontSize: 20))),
          ],
        ),
      ),
    );
  }
}

class _SectionGap extends StatelessWidget {
  const _SectionGap();

  @override
  Widget build(BuildContext context) => Container(height: 18, color: const Color(0xFFF4F2F2));
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
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.fromLTRB(24, 14, 24, 16),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFE1E1E1)))),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 20, color: Colors.black)),
            const SizedBox(height: 4),
            Text(_subtitle(definition.type, record), maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 15, color: Color(0xFF555555))),
          ],
        ),
      ),
    );
  }

  String _subtitle(EntityType type, Map<String, dynamic> record) {
    if (type == EntityType.account) return 'Phone: ${record['phone'] ?? 'Chưa có'}';
    if (type == EntityType.contact) return 'Account Name: ${record['account']?['name'] ?? record['email'] ?? 'Chưa có'}';
    if (type == EntityType.opportunity) return 'Account Name: ${record['account']?['name'] ?? formatCurrency(record['amount'])}';
    if (type == EntityType.task) return '${labelFor(record['status']?.toString())} • ${labelFor(record['priority']?.toString())}';
    if (type == EntityType.caseRecord) return '${labelFor(record['status']?.toString())} • ${labelFor(record['priority']?.toString())}';
    return subtitleFor(record);
  }
}

String _pluralTitle(EntityType type) {
  return switch (type) {
    EntityType.lead => 'Leads',
    EntityType.contact => 'Contacts',
    EntityType.account => 'Accounts',
    EntityType.opportunity => 'Opportunities',
    EntityType.task => 'Tasks',
    EntityType.caseRecord => 'Cases',
  };
}

List<String> _listViews(EntityType type) {
  return switch (type) {
    EntityType.lead => const ["Today's Leads", 'My Unread Leads', 'All Leads', 'Recently Viewed Leads'],
    EntityType.contact => const ['All Contacts', 'Birthdays This Month', 'My Contacts', 'Recently Viewed Contacts'],
    EntityType.account => const ['All Accounts', 'My Accounts', 'New This Week', 'Recently Viewed Accounts'],
    EntityType.opportunity => const ['All Opportunities', 'Closing Next Month', 'My Opportunities', 'Recently Viewed Opportunities'],
    EntityType.task => const ['All Tasks', 'My Open Tasks', 'Completed Tasks', 'Recently Viewed Tasks'],
    EntityType.caseRecord => const ['All Cases', 'Open Cases', 'High Priority Cases', 'Recently Viewed Cases'],
  };
}
