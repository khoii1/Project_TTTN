import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/models/api_models.dart';
import '../recycle_bin/recycle_bin_screen.dart';
import '../records/record_list_screen.dart';
import '../search/search_screen.dart';
import 'dashboard_screen.dart';
import 'menu_screen.dart';

class HomeShell extends StatefulWidget {
  const HomeShell({super.key, required this.apiClient});

  final ApiClient apiClient;

  @override
  State<HomeShell> createState() => _HomeShellState();
}

class _HomeShellState extends State<HomeShell> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final pages = [
      RecordListScreen(apiClient: widget.apiClient, definition: recordDefinitions[EntityType.lead]!),
      RecordListScreen(apiClient: widget.apiClient, definition: recordDefinitions[EntityType.contact]!),
      RecordListScreen(apiClient: widget.apiClient, definition: recordDefinitions[EntityType.account]!),
      RecordListScreen(apiClient: widget.apiClient, definition: recordDefinitions[EntityType.opportunity]!),
      MenuScreen(
        apiClient: widget.apiClient,
        onOpen: (type) {
          final definition = recordDefinitions[type]!;
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => RecordListScreen(apiClient: widget.apiClient, definition: definition, standalone: true),
            ),
          );
        },
        onSearch: () {
          Navigator.of(context).push(MaterialPageRoute(builder: (_) => SearchScreen(apiClient: widget.apiClient)));
        },
        onRecycleBin: () {
          Navigator.of(context).push(MaterialPageRoute(builder: (_) => RecycleBinScreen(apiClient: widget.apiClient)));
        },
        onDashboard: () {
          Navigator.of(context).push(MaterialPageRoute(builder: (_) => DashboardScreen(apiClient: widget.apiClient)));
        },
        onLogout: () => context.read<AuthController>().logout(),
      ),
    ];

    return Scaffold(
      body: pages[_index],
      bottomNavigationBar: NavigationBar(
        backgroundColor: Colors.white,
        indicatorColor: const Color(0xFFEAF3FF),
        selectedIndex: _index,
        onDestinationSelected: (value) => setState(() => _index = value),
        destinations: const [
          NavigationDestination(icon: Icon(Icons.star, color: Colors.grey), selectedIcon: Icon(Icons.star, color: Color(0xFF0176D3)), label: 'Leads'),
          NavigationDestination(icon: Icon(Icons.contact_page, color: Colors.grey), selectedIcon: Icon(Icons.contact_page, color: Color(0xFF0176D3)), label: 'Contacts'),
          NavigationDestination(icon: Icon(Icons.business, color: Colors.grey), selectedIcon: Icon(Icons.business, color: Color(0xFF0176D3)), label: 'Accounts'),
          NavigationDestination(
            icon: Icon(Icons.workspace_premium, color: Colors.grey),
            selectedIcon: Icon(Icons.workspace_premium, color: Color(0xFF0176D3)),
            label: 'Opportunities',
          ),
          NavigationDestination(icon: Icon(Icons.menu, color: Colors.grey), selectedIcon: Icon(Icons.menu, color: Color(0xFF0176D3)), label: 'Menu'),
        ],
      ),
    );
  }
}
