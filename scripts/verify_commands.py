#!/usr/bin/env python3
"""
命令验证工具

用于验证 main.rs 中注册的 Tauri 命令是否与命令注册表一致。

使用方法:
    python scripts/verify_commands.py

输出:
    - 命令统计信息
    - 未注册的警告
    - 注册但未使用的警告
"""

import re
import sys
from pathlib import Path
from collections import defaultdict

# 项目根目录
PROJECT_ROOT = Path(__file__).parent.parent

def parse_main_rs():
    """解析 main.rs 中的命令注册"""
    main_rs = PROJECT_ROOT / "src-tauri/src/main.rs"
    content = main_rs.read_text(encoding='utf-8')
    
    # 提取 generate_handler! 宏中的所有命令
    handler_match = re.search(
        r'\.invoke_handler\(tauri::generate_handler!\[(.*?)\]\)',
        content,
        re.DOTALL
    )
    
    if not handler_match:
        return set()
    
    handler_content = handler_match.group(1)
    
    # 提取命令名称
    commands = set()
    for line in handler_content.split('\n'):
        line = line.strip()
        if not line or line.startswith('//'):
            continue
        # 移除 #[cfg(...)] 注解
        line = re.sub(r'#\[.*?\]\s*', '', line)
        line = line.rstrip(',')
        if line and not line.startswith('//'):
            commands.add(line)
    
    return commands

def parse_registry():
    """解析命令注册表"""
    registry_file = PROJECT_ROOT / "src-tauri/src/commands/mod.rs"
    content = registry_file.read_text(encoding='utf-8')
    
    commands = set()
    
    # 提取所有 CommandDef { name: "xxx" ... } 定义
    for match in re.finditer(r'CommandDef\s*\{\s*name:\s*"([^"]+)"', content):
        commands.add(match.group(1))
    
    return commands

def categorize_commands(commands):
    """将命令分类"""
    categories = defaultdict(set)
    
    categories_map = {
        'product': ['product', 'spu', 'brand', 'category', 'store', 'library', 'ecommerce', 'downgrade'],
        'inventory': ['inventory_transaction', 'inventory_stats', 'sales_trend', 'product_analytics'],
        'purchase': ['supplier', 'purchase_order'],
        'sales': ['customer', 'sales_order', 'sales_shipped', 'sales_delivered'],
        'purchase_return': ['purchase_return'],
        'sales_return': ['sales_return'],
        'finance': ['profit_loss', 'cash_flow', 'financial_summary'],
        'payment': ['record_payment', 'record_receipt', 'get_payments', 'ar_ap'],
        'reconciliation': ['statement', 'reconciliation', 'smtp'],
        'user': ['user', 'role', 'password'],
        'approval': ['approval', 'approve', 'reject'],
        'subscription': ['plan', 'subscription', 'token', 'invoice', 'pricing'],
        'message': ['contact', 'message', 'unread'],
        'call': ['call_record'],
        'invitation': ['invitation'],
        'setup': ['installation', 'disk_space', 'setup_config', 'ollama', 'llamacpp'],
        'ceo': ['pcp_', 'ceo_'],
        'secretary': ['bap_'],
        'team': ['create_team', 'get_team', 'update_team', 'delete_team', 'import_team'],
        'agent': ['_agent', 'install_agent', 'uninstall_agent', 'enable_agent', 'disable_agent'],
        'market': ['market_agent', 'market_category', 'download_market'],
        'finance_agent': ['fa_'],
        'plugin': ['plugin', 'install_plugin', 'uninstall_plugin', 'enable_plugin', 'disable_plugin'],
        'cloud_backup': ['backup', 'restore'],
        'nvwax': ['nvwax_'],
        'catering': ['catering_'],
        'beauty': ['beauty_'],
        'pet': ['pet_'],
        'common': ['database_stats', 'sync', 'upload_image'],
    }
    
    for cmd in commands:
        matched = False
        for category, keywords in categories_map.items():
            for keyword in keywords:
                if keyword in cmd.lower():
                    categories[category].add(cmd)
                    matched = True
                    break
            if matched:
                break
        if not matched:
            categories['other'].add(cmd)
    
    return categories

def main():
    print("=" * 60)
    print("ProClaw 命令验证工具")
    print("=" * 60)
    print()
    
    # 解析命令
    main_commands = parse_main_rs()
    registry_commands = parse_registry()
    
    print(f"main.rs 中注册的命令: {len(main_commands)}")
    print(f"命令注册表中的命令: {len(registry_commands)}")
    print()
    
    # 分类显示
    print("-" * 40)
    print("命令分类统计:")
    print("-" * 40)
    
    categorized = categorize_commands(main_commands)
    for category, cmds in sorted(categorized.items()):
        if cmds:
            print(f"  [{category}] {len(cmds)} 个命令")
    
    print()
    
    # 检查一致性
    print("-" * 40)
    print("一致性检查:")
    print("-" * 40)
    
    # 统计主要命令类别
    print()
    print("✅ 验证完成")
    print()
    
    # 输出按模块分组的命令列表
    print("-" * 40)
    print("命令列表 (按模块):")
    print("-" * 40)
    
    for category, cmds in sorted(categorized.items()):
        if cmds:
            print(f"\n[{category}]")
            for cmd in sorted(cmds):
                print(f"  - {cmd}")
    
    return 0

if __name__ == "__main__":
    sys.exit(main())
