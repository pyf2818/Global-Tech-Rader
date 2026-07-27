import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage, SUPPORTED_LANGS } from '../i18n/index.js';

/**
 * LanguageSwitcher - 顶部导航栏语言切换器
 *
 * 显示当前语言代码（中文 / EN），点击展开下拉菜单切换。
 * 切换后通过 i18n 立即生效，并持久化到 localStorage。
 *
 * 使用：
 *   <LanguageSwitcher />
 *
 * Props:
 *   - variant: 'compact' | 'full'，compact 仅显示图标+代码，full 显示完整名称（默认 compact）
 *   - className: 容器自定义类
 */
const LANG_OPTIONS = [
  { code: 'zh-CN', label: '中文', short: '中' },
  { code: 'en', label: 'English', short: 'EN' },
];

export default function LanguageSwitcher({ variant = 'compact', className = '' }) {
  const { i18n: i18nInstance, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const currentLang = i18nInstance.language || 'zh-CN';
  const currentOption = LANG_OPTIONS.find(o => o.code === currentLang) || LANG_OPTIONS[0];

  // 点击外部关闭下拉
  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // ESC 关闭
  useEffect(() => {
    if (!open) return;
    function handleEsc(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  function handleSelect(langCode) {
    changeLanguage(langCode);
    setOpen(false);
  }

  return (
    <div className={`lang-switcher ${className}`.trim()} ref={containerRef}>
      <button
        type="button"
        className="lang-switcher-trigger"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t('settings.general.language')}
        title={t('settings.general.language')}
      >
        <svg className="lang-switcher-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        <span className="lang-switcher-label">
          {variant === 'compact' ? currentOption.short : currentOption.label}
        </span>
        <svg className={`lang-switcher-chevron ${open ? 'is-open' : ''}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <ul className="lang-switcher-menu" role="listbox" aria-label={t('settings.general.language')}>
          {LANG_OPTIONS.map(opt => {
            const isActive = opt.code === currentLang;
            return (
              <li
                key={opt.code}
                role="option"
                aria-selected={isActive}
                tabIndex={0}
                className={`lang-switcher-option ${isActive ? 'is-active' : ''}`}
                onClick={() => handleSelect(opt.code)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleSelect(opt.code);
                  }
                }}
              >
                <span className="lang-switcher-option-label">{opt.label}</span>
                <span className="lang-switcher-option-short">{opt.short}</span>
                {isActive && (
                  <svg className="lang-switcher-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
