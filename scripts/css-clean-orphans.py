#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
styles.css 孤儿选择器清理脚本
扫描并删除以下情形：
1. 连续的选择器行（以 , 结尾）后跟空行 / 另一规则，没有 { 块
2. 多 selector rule 中所有 class 都在死列表中的孤儿行
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"
JSX_DIR = ROOT / "src"

# 复用 css-diet.py 的死 class 列表（包括动态白名单）
KEEP_DYNAMIC_PATTERNS = {
    "status-archived", "status-blocked", "status-completed", "status-done",
    "status-draft", "status-failed", "status-published", "status-running", "status-skipped",
    "tool-call-done", "tool-call-error", "tool-call-running",
    "tool-call-status-done", "tool-call-status-error", "tool-call-status-running",
    "editor-mode-edit", "editor-mode-preview", "editor-mode-split",
    "tone-amber", "tone-blue", "tone-green",
    "type-case", "type-chart", "type-data", "type-project", "type-quote", "type-viewpoint",
    "is-done", "is-failed", "is-running", "is-skipped",
    "mode-deep", "mode-flash", "mode-technical",
    "health-error", "health-healthy",
    "sandbox-approval-default", "sandbox-approval-off", "sandbox-approval-on",
    "sandbox-tool-state-off", "sandbox-tool-state-on",
    "alert-error", "alert-warning",
}

# 重新计算 truly_dead 列表（与 css-diet.py 相同）
DEAD_CLASSES = [
    "workbench-shell", "workbench-ai", "workbench-overview", "workbench-feed-panel",
    "workbench-title", "workbench-subtitle", "workbench-preferences", "workbench-metrics",
    "workbench-text-btn", "workbench-toolbar", "workbench-toolbar-actions", "workbench-search",
    "workbench-refresh", "workbench-filter-row", "workbench-hero-copy",
    "workbench-profile-strip", "workbench-news-list", "workbench-news-card",
    "workbench-score-badge", "workbench-reason-strip", "workbench-bubble-area",
    "workbench-block-title", "workbench-section-label",
    "agent-ecosystem-card", "agent-status-list", "agent-status-item",
    "agent-profile-strip", "agent-memory-card", "agent-memory-row",
    "agent-task-card", "agent-task-stats", "agent-task-title",
    "ai-daily-insight", "ai-signal-grid", "ai-priority-list",
    "ai-command-card", "ai-prompt-list", "ai-mission-list",
    "ai-card-judgement", "ai-daily-main",
    "ai-elf-agent-select", "ai-elf-chat-input-row", "ai-elf-chat-title",
    "ai-elf-history-delete", "ai-elf-history-empty", "ai-elf-history-header",
    "ai-elf-history-item", "ai-elf-history-item-delete", "ai-elf-history-item-meta",
    "ai-elf-history-item-title", "ai-elf-history-list", "ai-elf-history-meta",
    "ai-elf-history-panel", "ai-elf-history-title",
    "ai-elf-sidebar-empty", "ai-elf-sidebar-tab", "ai-elf-sidebar-tabs",
    "ai-chat-mobile-toggle", "ai-resize-handle", "ai-result-inline",
    "ai-toolbar-btn", "ai-toolbar-label",
    "date-manager", "date-pill-row", "date-pill", "date-info", "date-manager-head",
    "quality-card", "next-actions-card", "interest-chip",
    "intelligence-side-stack", "intelligence-score-grid",
    "intelligence-entity-strip", "intelligence-opportunity-list",
    "intelligence-opportunity", "intelligence-weekly-sector",
    "intelligence-mini-list", "intelligence-mini-item",
    "intelligence-alert-opportunity", "intelligence-alert-risk",
    "intelligence-alert-sector", "intelligence-feed-layout",
    "intelligence-lead-card",
    "briefing-cat-item", "briefing-cat-item-source", "briefing-cat-item-title",
    "briefing-cat-items", "briefing-cat-title", "briefing-categories",
    "briefing-category-card", "briefing-config", "briefing-config-row",
    "briefing-item", "briefing-item-content", "briefing-item-meta",
    "briefing-item-title", "briefing-keyword", "briefing-keywords",
    "briefing-length-btn", "briefing-rank", "briefing-section",
    "briefing-section-title", "briefing-stat-label", "briefing-stat-value",
    "briefing-stats", "briefing-top-news",
    "insight-keywords", "insight-kw", "insight-news-body", "insight-news-item",
    "insight-news-meta", "insight-news-num", "insight-news-title",
    "insight-signal-accent", "insight-signal-body", "insight-signal-card",
    "insight-signal-count", "insight-signal-desc", "insight-signal-name",
    "insight-signal-pct", "insight-signals", "insight-top-news",
    "must-read-badge", "must-read-card", "must-read-grade", "must-read-grid",
    "must-read-header", "must-read-top5-card", "must-read-top5-cards",
    "must-read-top5-count", "must-read-top5-grade", "must-read-top5-grid",
    "must-read-top5-header", "must-read-top5-meta", "must-read-top5-rank",
    "must-read-top5-reason", "must-read-top5-score", "must-read-top5-title",
    "tracker-add-btn", "tracker-add-form", "tracker-card", "tracker-card-header",
    "tracker-grid", "tracker-name", "tracker-preset-btn", "tracker-preset-label",
    "tracker-recent", "tracker-recent-item", "tracker-recent-source",
    "tracker-recent-title", "tracker-recent-title-text", "tracker-remove-btn",
    "tracker-stat", "tracker-stat-label", "tracker-stat-value", "tracker-stats",
    "sector-chart", "sector-chart-legend", "sector-daily-breakdown",
    "sector-daily-date", "sector-daily-item", "sector-daily-val",
    "sector-legend-item", "sector-line-chart", "sector-stats-growth",
    "sector-stats-left", "sector-stats-name", "sector-stats-panel",
    "sector-stats-right", "sector-stats-status", "sector-stats-val",
    "gh-intel-grid", "gh-readme-intro", "gh-readme-label", "gh-readme-text",
    "gh-scenario", "gh-scenario-inline", "gh-scenario-label", "gh-scenario-text",
    "gh-value",
    "hotspot-fire", "hotspot-header", "hotspot-meta", "hotspot-rank",
    "hotspot-rows", "hotspot-subtitle", "hotspot-title", "hotspot-title-main",
    "emerging-count", "emerging-kw", "emerging-topic-item", "emerging-topics", "emerging-trend",
    "reading-heat-block", "reading-heat-cell", "reading-heat-count",
    "reading-heat-day", "reading-heat-row",
    "newspaper-quick-card", "newspaper-quick-date", "newspaper-quick-expand",
    "newspaper-quick-head", "newspaper-quick-kicker",
    "calendar-grid", "calendar-insight-card", "calendar-insight-label",
    "calendar-insight-value", "calendar-insights", "calendar-nav",
    "calendar-page", "calendar-upcoming", "calendar-upcoming-dot",
    "calendar-upcoming-item", "calendar-upcoming-list", "calendar-upcoming-main",
    "calendar-upcoming-name", "calendar-upcoming-time", "calendar-upcoming-title",
    "cal-day", "cal-day-detail", "cal-day-header", "cal-day-num", "cal-days",
    "cal-event-dot", "cal-event-more", "cal-heat-indicator", "cal-nav-btn",
    "cal-title", "cal-today-btn", "cal-weekday", "cal-weekdays",
    "chat-mobile-close", "chat-model-bar", "chat-model-dot", "chat-model-select",
    "chat-msg-assistant", "chat-msg-user", "chat-quick-btn", "chat-send-spinner",
    "chat-send-stop", "chat-session-delete", "chat-session-info", "chat-session-item",
    "chat-session-time", "chat-session-title", "chat-sessions", "chat-sessions-empty",
    "chat-sessions-header", "chat-sessions-list", "chat-welcome-actions", "chat-welcome-cursor",
    "event-color", "event-info", "event-input", "event-list",
    "event-modal", "event-modal-footer", "event-modal-header",
    "elf-appearance-preview", "elf-appearance-upload", "elf-avatar-history",
    "elf-avatar-history-item", "elf-avatar-history-list", "elf-avatar-history-title",
    "elf-avatar-preview-img",
    "block-grid-card-primary", "block-grid-cols-2", "block-grid-cols-3", "block-grid-cols-4",
    "block-grid-gap-lg", "block-grid-gap-md", "block-grid-gap-sm",
    "block-list-gap-lg", "block-list-gap-md", "block-list-gap-sm",
    "block-panel-flat", "block-panel-highlight",
    "block-stat-lg", "block-stat-md", "block-stat-sm",
    "block-stat-trend-down", "block-stat-trend-neutral", "block-stat-trend-up",
    "llm-config-actions-row", "llm-config-fetch-btn", "llm-config-hint",
    "llm-config-input", "llm-config-input-group", "llm-config-label",
    "llm-config-section", "llm-config-section-title", "llm-config-test-status",
    "llm-config-title-icon", "llm-preset-picker", "llm-provider-icon", "llm-provider-name",
    "stock-header-actions", "stock-kline-container", "stock-search-price",
    "stock-watch-code", "stock-watch-item", "stock-watch-main",
    "stock-watch-name", "stock-watch-op", "stock-watch-ops",
    "stock-watchlist", "stock-watchlist-count", "stock-watchlist-empty",
    "stock-watchlist-grid",
    "studio-asset-panel", "studio-module-desc", "studio-module-icon", "studio-module-title",
    "square-comment", "square-comment-input", "square-comment-time",
    "square-comment-user", "square-comments-empty", "square-comments-list",
    "square-feed", "square-layout", "square-post", "square-post-actions",
    "square-post-comments", "square-post-head", "square-post-tag", "square-post-type",
    "square-side",
    "user-avatar-lg", "user-menu-badge", "user-menu-btn", "user-menu-divider",
    "user-menu-dropdown", "user-menu-email", "user-menu-header", "user-menu-icon",
    "user-menu-info", "user-menu-item", "user-menu-login", "user-menu-logout",
    "user-menu-name", "user-menu-wrap", "user-name",
    "signal-center-header", "signal-empty", "signal-filter-btn", "signal-filters",
    "source-activity-item", "source-activity-list", "source-cats", "source-dot",
    "source-num", "source-select-checkbox", "source-stats", "source-time",
    "sources-group-title",
    "custom-sources-actions", "custom-sources-list", "custom-sources-toolbar",
    "builtin-action-btn", "builtin-actions", "builtin-header", "builtin-list",
    "builtin-more", "builtin-search", "builtin-title",
    "timeline-manager", "timeline-manager-head",
    "trends-note",
    "toast-notification",
    "template-dropdown-item", "template-dropdown-menu",
    "nav-context-arrow", "nav-context-toggle", "nav-follow-badge", "nav-more-toggle",
    "item-actions-left", "item-intro", "item-media-grid", "item-media-grid-cell",
    "item-media-more", "item-platform", "item-reading-time", "item-translation",
    "keyword-cloud", "keyword-count",
    "legend-label", "legend-val",
    "metric-card", "metric-change",
    "load-more-btn", "load-more-sentinel-center", "load-more-sentinel-done",
    "level-good", "level-light", "level-neutral",
    "score-high", "score-low", "score-mid",
    "region-domestic", "region-global", "region-overseas",
    "recommendation-label", "recommendation-text", "recommendations-toolbar",
    "profile-load-more-btn", "profile-load-more-wrap", "profile-recommendations",
    "progress-bar", "progress-bar-fill",
    "quality-card",
    "read-toggle",
    "panel-intelligence",
    "other-month",
    "no-emerging", "no-events",
    "next-actions-card",
    "neon-text",
    "scrolling-news-nav",
    "select-by-grade",
    "settings-tab", "settings-tabs",
    "sidebar-nav-item", "sidebar-section-title",
    "view-compact",
    "verify-progress", "verify-source-btn",
    "tech-badge",
    "trend-source-stats",
    "trending-platform-bar", "trending-toolbar",
    "hero-briefing-stat-num", "hero-briefing-summary",
    "glass-card", "glow-border", "glow-red", "glow-title",
    "globe-tooltip", "globe-section",
    "follow-panel-match",
    "import-export-btn",
    "material-project", "materials-filters",
    "meta-text",
    "cat-heat-bar", "cat-heat-count", "cat-heat-fill", "cat-heat-icon",
    "cat-heat-info", "cat-heat-name", "cat-heat-sources",
    "category-heat-card",
    "cross-source",
    "color-dot", "color-picker",
    "article-ai-toolbar",
    "ask-ai-btn",
    "batch-mode-icon", "batch-mode-toggle-btn", "batch-select-all", "batch-selection-count",
    "btn-goto-settings", "btn-quick-config-inline", "btn-template-menu",
    "add-event-btn", "add-source-form",
    "app-bg-grid",
    "heat-1", "heat-2", "heat-3", "heat-4",
    "grade-a",
]

TRULY_DEAD = set(DEAD_CLASSES) - KEEP_DYNAMIC_PATTERNS


def find_class_in_jsx(class_name):
    """检查 class 名是否在任何 jsx/js 文件中使用"""
    for ext in ['*.jsx', '*.js']:
        for f in JSX_DIR.rglob(ext):
            if '_pre_refactor' in f.name:
                continue
            try:
                content = f.read_text(encoding='utf-8')
                if class_name in content:
                    return True
            except:
                continue
    return False


def is_orphan_selector(line):
    """判断是否为孤儿选择器行（无 { 的选择器行）"""
    s = line.strip()
    if not s:
        return False
    if '{' in s:
        return False
    if s.startswith('/*') or s.startswith('//') or s.startswith('*'):
        return False
    if s.startswith('@'):
        return False
    if s.startswith('--'):
        return False
    # 跳过属性行（缩进+冒号+分号）
    if s.endswith(';') and ':' in s and not s.startswith('.'):
        return False
    # 选择器特征：包含 .class 或 #id
    if re.search(r'[.#][a-zA-Z]', s) or s.endswith(','):
        return True
    return False


def selector_classes(line):
    """提取选择器行中的所有 class 名"""
    return re.findall(r'\.([\w-]+)', line)


def main():
    content = CSS_PATH.read_text(encoding='utf-8')
    lines = content.splitlines(keepends=True)
    total = len(lines)
    print(f"原始行数: {total}")

    # 找出所有孤儿选择器行
    print("\n扫描孤儿选择器...")
    orphans = []
    for i, line in enumerate(lines):
        if is_orphan_selector(line):
            # 检查附近上下文，确认是真的孤儿（前后没有 {）
            ctx_start = max(0, i - 5)
            ctx_end = min(len(lines), i + 5)
            ctx_text = ''.join(lines[ctx_start:ctx_end])
            # 如果上下文 5 行内有 {，则可能是正常多行选择器列表的一员
            # 我们需要更精确：从孤儿行向前找直到遇到 { 或 文件开头
            # 如果找到的最近的有 { 的行包含的死 class 全部在死列表中，则该孤儿也属于这条规则
            # 简化策略：检查孤儿行自身所有 class 是否在死列表中
            classes = selector_classes(line)
            if not classes:
                continue
            # 如果该行所有 class 都是死 class，则可安全删除
            if all(c in TRULY_DEAD for c in classes):
                orphans.append((i, line.rstrip('\n')))
            # 如果该行有死 class 也有活 class（如 .ai-command-card.compact），保留
            # 这种情况说明原规则是混合的，不能简单删除

    print(f"找到 {len(orphans)} 个孤儿选择器行")
    if orphans:
        print("\n前 30 个示例:")
        for i, line in orphans[:30]:
            print(f"  L{i+1}: {line[:80]}")

    # 标记要删除的行
    to_delete = [False] * total
    for i, _ in orphans:
        to_delete[i] = True

    # 同时删除相邻的空行（孤儿行之间经常有连续空行）
    # 策略：标记删除后，重新扫描连续的孤儿+空行块
    # 如果块中的所有非空行都是孤儿，则块中的空行也删除
    print("\n清理相邻空行...")
    i = 0
    while i < total:
        if to_delete[i]:
            # 找到连续块
            block_start = i
            while i < total and (to_delete[i] or lines[i].strip() == ''):
                # 检查块内是否还有非孤儿非空行
                if not to_delete[i] and lines[i].strip() != '':
                    break
                i += 1
            block_end = i
            # 检查块内：是否所有非空行都是孤儿？
            block_has_non_orphan = False
            for j in range(block_start, block_end):
                if lines[j].strip() == '':
                    continue
                if not to_delete[j]:
                    block_has_non_orphan = True
                    break
            if not block_has_non_orphan and block_end - block_start > 1:
                # 整块都是孤儿+空行，标记所有空行也删除
                for j in range(block_start, block_end):
                    to_delete[j] = True
        else:
            i += 1

    delete_count = sum(1 for x in to_delete if x)
    print(f"\n总删除行数: {delete_count}")

    new_lines = [lines[i] for i in range(total) if not to_delete[i]]
    CSS_PATH.write_text(''.join(new_lines), encoding='utf-8')
    print(f"新行数: {len(new_lines)} (减少 {total - len(new_lines)})")


if __name__ == '__main__':
    main()
