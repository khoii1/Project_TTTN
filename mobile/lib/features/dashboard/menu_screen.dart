import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../../core/api/api_client.dart';
import '../../core/auth/auth_controller.dart';
import '../../core/models/api_models.dart';
import '../../core/utils/formatters.dart';
import '../../core/widgets/common_widgets.dart';

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
            padding: const EdgeInsets.fromLTRB(20, 12, 20, 16),
            child: Align(
              alignment: Alignment.centerLeft,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Menu', style: Theme.of(context).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800, color: Colors.black)),
                  if (user != null) ...[
                    const SizedBox(height: 4),
                    Text('${user.displayName} • ${labelFor(user.role)}', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 13, color: Color(0xFF667085))),
                  ],
                ],
              ),
            ),
          ),
          const Divider(height: 2, thickness: 2, color: Color(0xFF0176D3)),
          Expanded(
            child: ListView(
              children: [
                _MenuTile(key: const ValueKey('menuDashboardButton'), icon: Icons.dashboard_outlined, iconColor: Color(0xFF147EAA), title: 'Tổng quan', onTap: onDashboard),
                _MenuTile(key: const ValueKey('menuGlobalSearchButton'), icon: Icons.search, iconColor: Color(0xFF0176D3), title: 'Tìm kiếm toàn cục', onTap: onSearch),
                _MenuTile(key: const ValueKey('menuRecycleBinButton'), icon: Icons.restore_from_trash, iconColor: Color(0xFF8A98A8), title: 'Thùng rác', onTap: onRecycleBin),
                const _SectionTitle(title: 'Bán hàng'),
                _MenuTile(key: const ValueKey('menuLeadButton'), icon: Icons.star, iconColor: Color(0xFF00A1A7), title: 'Lead', onTap: () => onOpen(EntityType.lead)),
                _MenuTile(key: const ValueKey('menuContactButton'), icon: Icons.contact_page, iconColor: Color(0xFFA100D6), title: 'Liên hệ', onTap: () => onOpen(EntityType.contact)),
                _MenuTile(key: const ValueKey('menuAccountButton'), icon: Icons.business, iconColor: Color(0xFF5867E8), title: 'Công ty', onTap: () => onOpen(EntityType.account)),
                _MenuTile(key: const ValueKey('menuOpportunityButton'), icon: Icons.workspace_premium, iconColor: Color(0xFFFF5A36), title: 'Cơ hội', onTap: () => onOpen(EntityType.opportunity)),
                _MenuTile(key: const ValueKey('menuTaskButton'), icon: Icons.task_alt, iconColor: Color(0xFF2EAA58), title: 'Công việc', onTap: () => onOpen(EntityType.task)),
                _MenuTile(key: const ValueKey('menuCaseButton'), icon: Icons.support_agent, iconColor: Color(0xFF1686B0), title: 'Hỗ trợ', onTap: () => onOpen(EntityType.caseRecord)),
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
      padding: const EdgeInsets.fromLTRB(20, 14, 20, 4),
      child: Row(
        children: [
          const CircleAvatar(radius: 22, backgroundColor: Color(0xFF8AA0B4), child: Icon(Icons.person, color: Colors.white, size: 26)),
          const Spacer(),
          IconButton(
            key: const ValueKey('menuTopSearchButton'),
            tooltip: 'Tìm kiếm',
            onPressed: onSearch,
            icon: const Icon(Icons.search, color: Color(0xFF0176D3), size: 26),
          ),
          IconButton(
            tooltip: 'Thông báo',
            onPressed: () => showCrmSnack(context, 'Thông báo sẽ được bổ sung sau'),
            icon: const Icon(Icons.notifications_none, color: Color(0xFF0176D3), size: 26),
          ),
          PopupMenuButton<String>(
            key: const ValueKey('menuAccountPopupButton'),
            tooltip: 'Tài khoản',
            onSelected: (value) {
              if (value == 'logout') onLogout();
            },
            itemBuilder: (_) => const [PopupMenuItem(value: 'logout', child: Text('Đăng xuất'))],
            icon: const Icon(Icons.more_vert, color: Color(0xFF0176D3), size: 26),
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
      padding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
      child: Row(
        children: [
          const Icon(Icons.insert_chart_outlined, color: Colors.grey, size: 24),
          const SizedBox(width: 12),
          Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
        ],
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  const _MenuTile({
    super.key,
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
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 11),
        decoration: const BoxDecoration(border: Border(bottom: BorderSide(color: Color(0xFFE1E1E1)))),
        child: Row(
          children: [
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(color: iconColor, borderRadius: BorderRadius.circular(8)),
              child: Icon(icon, color: Colors.white, size: 21),
            ),
            const SizedBox(width: 14),
            Expanded(child: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 16))),
            const Icon(Icons.chevron_right, color: Colors.grey, size: 26),
          ],
        ),
      ),
    );
  }
}
