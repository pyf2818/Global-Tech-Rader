#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
styles.css 嵌套规则删除脚本 v4 (迭代栈版)
处理 @media / @supports 等嵌套块内的规则。
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent.parent
CSS_PATH = ROOT / "src" / "styles.css"

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
    "intelligence-weekly-sector-head", "intelligence-weekly-sector-list",
    "intelligence-weekly-sector-meta",
    "intelligence-mini-list", "intelligence-mini-item",
    "intelligence-alert-opportunity", "intelligence-alert-risk",
    "intelligence-alert-sector", "intelligence-feed-layout",
    "intelligence-lead-card",
    "is-read",
    "reason-score", "reason-text",
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


def is_dead_selector(selector):
    """
    检查选择器是否死代码。
    策略：
    - 拆分 group selectors（按 ,）
    - 如果所有 part 都死，整个规则死
    - 单个 part 死的条件：part 中任何 class 在死列表中（且不是动态白名单）
    """
    # 拆分 group selectors
    parts = [p.strip() for p in selector.split(',')]
    if not parts:
        return False
    # 所有 part 都死，整个规则才死
    all_parts_dead = True
    for part in parts:
        classes = re.findall(r'\.([\w-]+)', part)
        if not classes:
            # 无 class 的 part（如 element selector），保守起见认为不死
            all_parts_dead = False
            break
        # 如果 part 中任何 class 是死 class（且不是动态白名单），整个 part 死
        part_dead = any(c in TRULY_DEAD for c in classes)
        if not part_dead:
            all_parts_dead = False
            break
    return all_parts_dead


def main():
    content = CSS_PATH.read_text(encoding='utf-8')
    lines = content.splitlines(keepends=True)
    total = len(lines)
    print(f"原始行数: {total}")

    # 用栈迭代解析
    # 每个 frame: (start_line, selector_start_line, depth, is_at_media, child_rules_deleted_count, child_rules_total_count)
    # 我们标记要删除的行号
    to_delete = [False] * total

    # 收集所有规则（扁平化，带嵌套信息）
    # rules: list of (selector_start, brace_end, selector, depth, parent_idx)
    rules = []
    stack = []  # 栈中保存当前所在的 @media 等块的索引

    i = 0
    while i < total:
        line = lines[i]
        stripped = line.strip()

        # 跳过空行和注释
        if not stripped or stripped.startswith('/*') or stripped.startswith('*') or stripped.startswith('//'):
            i += 1
            continue

        # 检查是否是规则开始（包含 {）
        if '{' in line:
            # 找到 { 之前的内容作为选择器
            brace_pos = line.index('{')
            # 选择器可能跨越多行，需要向前回溯
            selector_start = i
            # 回溯找选择器开始（向前找直到非空非属性行）
            while selector_start > 0:
                prev_line = lines[selector_start - 1].strip()
                if not prev_line or prev_line.endswith('}') or prev_line.endswith('{'):
                    break
                # 如果上一行像选择器（以 , 结尾或包含 . # 等）
                if prev_line.endswith(',') or re.search(r'[.#][a-zA-Z]', prev_line) or prev_line.startswith('@'):
                    selector_start -= 1
                else:
                    break

            selector_text = ''
            for k in range(selector_start, i + 1):
                selector_text += lines[k]
            selector_text = selector_text.split('{')[0].strip()

            # 找到匹配的 }
            # 注意：当前行可能同时包含 { 和 }（单行规则）
            brace_count = lines[i].count('{') - lines[i].count('}')
            j = i
            if brace_count > 0:
                # 多行规则，继续查找 }
                j = i + 1
                while j < total and brace_count > 0:
                    brace_count += lines[j].count('{') - lines[j].count('}')
                    if brace_count <= 0:
                        break
                    j += 1
            # brace_count == 0 时 j 是 } 所在行
            brace_end = j

            depth = len(stack)
            parent_idx = stack[-1] if stack else -1
            rule_idx = len(rules)
            rules.append({
                'selector_start': selector_start,
                'brace_start': i,
                'brace_end': brace_end,
                'selector': selector_text,
                'depth': depth,
                'parent_idx': parent_idx,
                'children': [],
                'is_at_rule': selector_text.startswith('@'),
            })
            if parent_idx >= 0:
                rules[parent_idx]['children'].append(rule_idx)

            # 如果是 @media/@supports 等嵌套块，压栈
            if selector_text.startswith('@media') or selector_text.startswith('@supports') or selector_text.startswith('@container'):
                stack.append(rule_idx)
                i = i + 1  # 进入块内
                continue

            i = brace_end + 1
            continue

        # 检查 } 表示退出当前块
        if '}' in line and stack:
            stack.pop()
        i += 1

    print(f"解析到 {len(rules)} 个规则")
    nested_count = sum(1 for r in rules if r['depth'] > 0)
    print(f"嵌套规则: {nested_count}")

    # 调试：输出前 5 个规则信息
    for idx in range(min(5, len(rules))):
        r = rules[idx]
        print(f"  规则 {idx}: L{r['selector_start']}-L{r['brace_end']} depth={r['depth']} sel={r['selector'][:60]!r}")
    # 调试：输出最后 5 个规则
    if len(rules) > 5:
        print(f"  ... 最后 {min(5, len(rules))} 个:")
        for idx in range(max(0, len(rules) - 5), len(rules)):
            r = rules[idx]
            print(f"  规则 {idx}: L{r['selector_start']}-L{r['brace_end']} depth={r['depth']} sel={r['selector'][:60]!r}")

    # 处理：先标记嵌套规则（@media 内的死规则）
    # 必须从最深开始处理（先处理子规则，再处理父规则）
    rules_by_depth_desc = sorted(range(len(rules)), key=lambda x: -rules[x]['depth'])

    deleted_rules = 0
    for idx in rules_by_depth_desc:
        r = rules[idx]
        # 如果是 @media 块，且其所有子规则都被标记删除，并且块内只剩空白，则删除整个 @media 块
        if r['is_at_rule'] and r['children']:
            # 检查所有子规则是否都被删除
            all_children_deleted = True
            for child_idx in r['children']:
                cr = rules[child_idx]
                # 检查子规则是否已标记删除
                already_deleted = to_delete[cr['brace_start']]
                if not already_deleted and not is_dead_selector(cr['selector']):
                    all_children_deleted = False
                    break
                if not already_deleted and is_dead_selector(cr['selector']):
                    # 此时才标记子规则删除
                    pass
                if not is_dead_selector(cr['selector']):
                    all_children_deleted = False
                    break

            # 标记死子规则删除
            for child_idx in r['children']:
                cr = rules[child_idx]
                if is_dead_selector(cr['selector']):
                    for k in range(cr['selector_start'], cr['brace_end'] + 1):
                        to_delete[k] = True
                    deleted_rules += 1

            if all_children_deleted:
                # 检查 @media 块内是否还有未删除的内容
                has_content = False
                for k in range(r['brace_start'] + 1, r['brace_end']):
                    if to_delete[k]:
                        continue
                    s = lines[k].strip()
                    if not s:
                        continue
                    has_content = True
                    break
                if not has_content:
                    # 删除整个 @media 块
                    for k in range(r['selector_start'], r['brace_end'] + 1):
                        to_delete[k] = True
                    deleted_rules += 1
        else:
            # 顶层规则或非嵌套规则
            if is_dead_selector(r['selector']):
                for k in range(r['selector_start'], r['brace_end'] + 1):
                    to_delete[k] = True
                deleted_rules += 1

    delete_line_count = sum(1 for x in to_delete if x)
    print(f"\n将删除 {deleted_rules} 个规则，{delete_line_count} 行")

    new_lines = [lines[i] for i in range(total) if not to_delete[i]]
    CSS_PATH.write_text(''.join(new_lines), encoding='utf-8')
    print(f"新行数: {len(new_lines)} (减少 {total - len(new_lines)})")


if __name__ == '__main__':
    main()
