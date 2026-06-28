// Formatting utilities extracted from App.jsx

export function formatTime(v) {
  return new Intl.DateTimeFormat('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(v));
}

export function formatRelative(v) {
  const diff = Date.now() - new Date(v).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `${mins}分钟前`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}小时前`;
  return formatTime(v);
}

export function formatStars(n) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

// 将 #rrggbb 转为 rgba(r,g,b,a)
export function hexToRgba(hex, alpha = 1) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
  if (!m) return `rgba(100, 116, 139, ${alpha})`;
  const r = parseInt(m[1].slice(0, 2), 16);
  const g = parseInt(m[1].slice(2, 4), 16);
  const b = parseInt(m[1].slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// 从源等级 color 派生 {primary, glow}，统一徽章配色（单一来源：服务端 SOURCE_GRADES）
export function getGradeColors(color) {
  return { primary: color || '#64748b', glow: hexToRgba(color || '#64748b', 0.28) };
}
