import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/models/api_models.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';
import '../records/record_detail_screen.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  Future<Map<RecordDefinition, PaginatedResult>>? _future;

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  void _search(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 450), () {
      final query = value.trim();
      setState(() {
        _future = query.length < 2 ? null : _load(query);
      });
    });
  }

  Future<Map<RecordDefinition, PaginatedResult>> _load(String query) async {
    final definitions = [
      recordDefinitions[EntityType.lead]!,
      recordDefinitions[EntityType.account]!,
      recordDefinitions[EntityType.contact]!,
      recordDefinitions[EntityType.opportunity]!,
      recordDefinitions[EntityType.task]!,
      recordDefinitions[EntityType.caseRecord]!,
    ];
    final results = await Future.wait(definitions.map((definition) => widget.apiClient.list(definition, search: query, limit: 5)));
    return {for (var i = 0; i < definitions.length; i++) definitions[i]: results[i]};
  }

  Future<void> _open(RecordDefinition definition, Map<String, dynamic> record) async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => RecordDetailScreen(apiClient: widget.apiClient, definition: definition, initialRecord: record)),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Tìm kiếm toàn cục')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 8),
            child: TextField(
              key: const ValueKey('globalSearchField'),
              controller: _controller,
              onChanged: _search,
              autofocus: true,
              decoration: const InputDecoration(hintText: 'Tìm Lead, công ty, liên hệ, cơ hội...', prefixIcon: Icon(Icons.manage_search)),
            ),
          ),
          Expanded(
            child: FutureBuilder<Map<RecordDefinition, PaginatedResult>>(
              future: _future,
              builder: (context, snapshot) {
                if (_future == null) return const EmptyView(message: 'Nhập ít nhất 2 ký tự để tìm kiếm', icon: Icons.search);
                if (snapshot.connectionState == ConnectionState.waiting) return const LoadingView();
                if (snapshot.hasError) return ErrorBanner(message: snapshot.error.toString(), onRetry: () => _search(_controller.text));
                final data = snapshot.data!;
                final total = data.values.fold<int>(0, (sum, result) => sum + result.items.length);
                if (total == 0) return const EmptyView(message: 'Không tìm thấy kết quả phù hợp');
                return ListView(
                  padding: const EdgeInsets.fromLTRB(14, 8, 14, 24),
                  children: [
                    for (final entry in data.entries)
                      if (entry.value.items.isNotEmpty) ...[
                        Text(entry.key.pluralTitle, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                        const SizedBox(height: 8),
                        ...entry.value.items.map((record) {
                          final title = entry.key.type == EntityType.lead ? leadName(record) : recordName(record);
                          return Padding(
                            padding: const EdgeInsets.only(bottom: 8),
                            child: CrmCard(
                              padding: EdgeInsets.zero,
                              child: ListTile(
                                key: ValueKey('globalSearchResult_${entry.key.type.name}_$title'),
                                dense: true,
                                onTap: () => _open(entry.key, record),
                                leading: Icon(iconFromName(entry.key.icon), color: Theme.of(context).colorScheme.primary),
                                title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
                                subtitle: Text(subtitleFor(record), maxLines: 1, overflow: TextOverflow.ellipsis),
                                trailing: const Icon(Icons.chevron_right),
                              ),
                            ),
                          );
                        }),
                        const SizedBox(height: 10),
                      ],
                  ],
                );
              },
            ),
          ),
        ],
      ),
    );
  }
}
