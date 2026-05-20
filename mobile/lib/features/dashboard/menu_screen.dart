import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/models/api_models.dart';

class MenuScreen extends StatelessWidget {
  const MenuScreen({
    super.key,
    required this.apiClient,
    required this.onOpen,
    required this.onSearch,
    required this.onRecycleBin,
    required this.onDashboard,
    required this.onLogout,
  });

  final ApiClient apiClient;
  final ValueChanged<EntityType> onOpen;
  final VoidCallback onSearch;
  final VoidCallback onRecycleBin;
  final VoidCallback onDashboard;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthController>().user;

    return SafeArea(
      child: Column(
        children: [
          _TopBar(onSearch: onSearch, onLogout: onLogout),
          Padding(
            padding: const EdgeInsets.fromLTRB(24, 24, 24, 26),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Menu', style: Theme.of(context).textTheme.headlineLarge?.copyWith(fontWeight: FontWeight.w800, color: Colors.black)),
                  if (user != null) ...[
                    const SizedBox(height: 6),
                    Text('${user.displayName} • ${user.role}', style: const TextStyle(fontSize: 14, color: Color(0xFF667085))),
                  ],
                ],
              ),
            ),
          ),
          const Divider(height: 3, thickness: 3, color: Color(0xFF0176D3)),
          Expanded(
            child: ListView(
              children: [
                _MenuTile(icon: Icons.apps, title: 'Bộ khởi chạy ứng dụng', onTap: () {}),
                _MenuTile(icon: Icons.search, iconColor: Color(0xFF0176D3), title: 'Tìm kiếm toàn cục', onTap: onSearch),
                _MenuTile(icon: Icons.restore_from_trash, iconColor: Color(0xFF8A98A8), title: 'Thùng rác', onTap: onRecycleBin),
                const _SectionTitle(title: 'Sales'),
                _MenuTile(icon: Icons.star, iconColor: Color(0xFF00A1A7), title: 'Leads', onTap: () => onOpen(EntityType.lead)),
                _MenuTile(icon: Icons.contact_page, iconColor: Color(0xFFA100D6), title: 'Contacts', onTap: () => onOpen(EntityType.contact)),
                _MenuTile(icon: Icons.business, iconColor: Color(0xFF5867E8), title: 'Accounts', onTap: () => onOpen(EntityType.account)),
                _MenuTile(icon: Icons.workspace_premium, iconColor: Color(0xFFFF5A36), title: 'Opportunities', onTap: () => onOpen(EntityType.opportunity)),
                _MenuTile(icon: Icons.task_alt, iconColor: Color(0xFF2EAA58), title: 'Tasks', onTap: () => onOpen(EntityType.task)),
                _MenuTile(icon: Icons.support_agent, iconColor: Color(0xFF1686B0), title: 'Cases', onTap: () => onOpen(EntityType.caseRecord)),
                _MenuTile(icon: Icons.analytics, iconColor: Color(0xFF147EAA), title: 'Tổng quan Analytics', onTap: onDashboard),
                const SizedBox(height: 24),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.onSearch, required this.onLogout});

  final VoidCallback onSearch;
  final VoidCallback onLogout;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(24, 24, 24, 8),
      child: Row(
        children: [
          const CircleAvatar(radius: 26, backgroundColor: Color(0xFF8AA0B4), child: Icon(Icons.person, color: Colors.white, size: 32)),
          const Spacer(),
          IconButton(onPressed: onSearch, icon: const Icon(Icons.search, color: Color(0xFF0176D3), size: 34)),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'logout') onLogout();
            },
            itemBuilder: (_) => const [PopupMenuItem(value: 'logout', child: Text('Đăng xuất'))],
            icon: const Icon(Icons.notifications, color: Color(0xFF0176D3), size: 34),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({required this.title});

  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      color: const Color(0xFFF4F2F2),
      padding: const EdgeInsets.fromLTRB(24, 28, 24, 12),
      child: Row(
        children: [
          const Icon(Icons.insert_chart_outlined, color: Colors.grey, size: 40),
          const SizedBox(width: 20),
          Text(title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    required this.icon,
    required this.title,
    required this.onTap,
    this.iconColor = Colors.grey,
  });

  final IconData icon;
  final String title;
  final VoidCallback onTap;
  final Color iconColor;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFE1E1E1)))),
        child: Row(
          children: [
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(color: iconColor, borderRadius: BorderRadius.circular(6)),
              child: Icon(icon, color: Colors.white, size: 28),
            ),
            const SizedBox(width: 22),
            Expanded(child: Text(title, style: const TextStyle(fontSize: 19))),
            const Icon(Icons.chevron_right, color: Colors.grey, size: 34),
          ],
        ),
      ),
    );
  }
}
