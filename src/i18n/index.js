/**
 * i18n 配置 - 中英文双语支持
 *
 * 默认中文，用户切换后持久化到 localStorage（key: appLanguage）
 * 支持的语言：zh-CN（中文）、en（英文）
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhCN from './locales/zh-CN.json';
import en from './locales/en.json';

const STORAGE_KEY = 'appLanguage';
const SUPPORTED_LANGS = ['zh-CN', 'en'];
const DEFAULT_LANG = 'zh-CN';

function detectInitialLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved;
  } catch { /* localStorage 不可用时降级 */ }
  return DEFAULT_LANG;
}

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en': { translation: en },
  },
  lng: detectInitialLanguage(),
  fallbackLng: DEFAULT_LANG,
  supportedLngs: SUPPORTED_LANGS,
  interpolation: {
    // React 已经默认转义，关闭 i18next 的二次转义
    escapeValue: false,
  },
  returnNull: false,
  returnEmptyString: false,
});

/**
 * 切换语言并持久化
 * @param {string} lang - 目标语言代码（'zh-CN' 或 'en'）
 */
export function changeLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) {
    console.warn(`[i18n] Unsupported language: ${lang}, fallback to ${DEFAULT_LANG}`);
    lang = DEFAULT_LANG;
  }
  i18n.changeLanguage(lang);
  try { localStorage.setItem(STORAGE_KEY, lang); } catch { /* ignore */ }
  // 同步 <html lang> 属性，便于辅助技术和 SEO
  try { document.documentElement.lang = lang; } catch { /* ignore */ }
}

export { SUPPORTED_LANGS, DEFAULT_LANG, STORAGE_KEY };
export default i18n;
