import 'package:flutter/material.dart';

import '../../core/api/api_client.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen> {
  late Future<_DashboardData> _future;

  @override
  void initState() {
    super.initState();
    _future = _load();
  }

  Future<_DashboardData> _load() async {
    final results = await Future.wait([
      widget.apiClient.get('/dashboard/summary'),
      widget.apiClient.get('/dashboard/leads-by-status'),
      widget.apiClient.get('/dashboard/opportunities-by-stage'),
      widget.apiClient.get('/dashboard/cases-by-priority'),
      widget.apiClient.get('/dashboard/upcoming-tasks', query: {'limit': 5}),
    ]);
    return _DashboardData(
      summary: Map<String, dynamic>.from(results[0] as Map),
      leadsByStatus: _asList(results[1]),
      opportunitiesByStage: _asList(results[2]),
      casesByPriority: _asList(results[3]),
      upcomingTasks: _asList(results[4]),
    );
  }

  void _reload() {
    setState(() {
      _future = _load();
    });
  }

  @override
  Widget build(BuildContext context) {
    return RefreshIndicator(
      onRefresh: () async => _reload(),
      child: FutureBuilder<_DashboardData>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) return const LoadingView();
          if (snapshot.hasError) {
            return ErrorBanner(message: snapshot.error.toString(), onRetry: _reload);
          }
          final data = snapshot.data!;
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              Text('Tổng quan', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)),
              const SizedBox(height: 12),
              _SummaryGrid(summary: data.summary),
              const SizedBox(height: 16),
              _GroupCard(title: 'Lead theo trạng thái', items: data.leadsByStatus, labelKey: 'status'),
              const SizedBox(height: 12),
              _GroupCard(title: 'Cơ hội theo giai đoạn', items: data.opportunitiesByStage, labelKey: 'stage', amountKey: 'amount'),
              const SizedBox(height: 12),
              _GroupCard(title: 'Case theo ưu tiên', items: data.casesByPriority, labelKey: 'priority'),
              const SizedBox(height: 12),
              CrmCard(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Task sắp tới', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
                    const SizedBox(height: 8),
                    if (data.upcomingTasks.isEmpty)
                      const Text('Chưa có task sắp tới')
                    else
                      ...data.upcomingTasks.map((item) {
                        final task = Map<String, dynamic>.from(item as Map);
                        return ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(task['subject']?.toString() ?? 'Task'),
                          subtitle: Text('Hạn: ${compactDate(task['dueDate'])}'),
                          trailing: Text(labelFor(task['priority']?.toString())),
                        );
                      }),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}

List<dynamic> _asList(dynamic json) {
  if (json is List) return json.cast<dynamic>();
  if (json is Map) {
    final data = json['data'] ?? json['value'];
    if (data is List) return data.cast<dynamic>();
  }
  return const [];
}

class _SummaryGrid extends StatelessWidget {
  const _SummaryGrid({required this.summary});

  final Map<String, dynamic> summary;

  @override
  Widget build(BuildContext context) {
    final items = [
      ('Tổng Lead', summary['totalLeads']?.toString() ?? '0', Icons.person_search),
      ('Accounts', summary['totalAccounts']?.toString() ?? '0', Icons.business),
      ('Contacts', summary['totalContacts']?.toString() ?? '0', Icons.contacts),
      ('Opportunities', summary['totalOpportunities']?.toString() ?? '0', Icons.trending_up),
      ('Open Pipeline', formatCurrency(summary['openOpportunitiesValue']), Icons.payments_outlined),
      ('Closed Won', formatCurrency(summary['closedWonValue']), Icons.emoji_events_outlined),
      ('Open Tasks', summary['openTasks']?.toString() ?? '0', Icons.task_alt),
      ('Open Cases', summary['openCases']?.toString() ?? '0', Icons.support_agent),
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 2,
        mainAxisSpacing: 10,
        crossAxisSpacing: 10,
        childAspectRatio: 1.35,
      ),
      itemCount: items.length,
      itemBuilder: (context, index) {
        final item = items[index];
        return CrmCard(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Icon(item.$3, color: Theme.of(context).colorScheme.primary),
              const Spacer(),
              Text(item.$2, style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w800)),
              Text(item.$1, maxLines: 1, overflow: TextOverflow.ellipsis),
            ],
          ),
        );
      },
    );
  }
}

class _GroupCard extends StatelessWidget {
  const _GroupCard({required this.title, required this.items, required this.labelKey, this.amountKey});

  final String title;
  final List<dynamic> items;
  final String labelKey;
  final String? amountKey;

  @override
  Widget build(BuildContext context) {
    return CrmCard(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
          const SizedBox(height: 8),
          if (items.isEmpty)
            const Text('Chưa có dữ liệu')
          else
            ...items.map((raw) {
              final item = Map<String, dynamic>.from(raw as Map);
              return Padding(
                padding: const EdgeInsets.symmetric(vertical: 6),
                child: Row(
                  children: [
                    Expanded(child: Text(labelFor(item[labelKey]?.toString()))),
                    Text('${item['count'] ?? 0}'),
                    if (amountKey != null) ...[
                      const SizedBox(width: 12),
                      Text(formatCurrency(item[amountKey])),
                    ],
                  ],
                ),
              );
            }),
        ],
      ),
    );
  }
}

class _DashboardData {
  const _DashboardData({
    required this.summary,
    required this.leadsByStatus,
    required this.opportunitiesByStage,
    required this.casesByPriority,
    required this.upcomingTasks,
  });

  final Map<String, dynamic> summary;
  final List<dynamic> leadsByStatus;
  final List<dynamic> opportunitiesByStage;
  final List<dynamic> casesByPriority;
  final List<dynamic> upcomingTasks;
}
