import { useEffect, useRef } from 'react';
import { showToast } from '../utils/toast.js';

function tierMap(rows) { return Object.fromEntries((rows || []).map(row => [row.id, row.tier])); }

async function responseJson(response) {
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.ok === false) {
    const error = new Error(payload?.error?.message || '画像同步失败');
    error.code = payload?.error?.code;
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function useProfileSync({ user, domainTiers, sourceTiers, specialFollows, setDomainTiers, setSourceTiers, setSpecialFollows }) {
  const hydratedUser = useRef('');
  const version = useRef(null);
  const skipSave = useRef(false);
  const pending = useRef(null);
  const saving = useRef(false);
  const timer = useRef(null);
  const drain = useRef(null);

  drain.current = async () => {
    if (saving.current || !user?.id) return;
    saving.current = true;
    try {
      while (pending.current) {
        const state = pending.current;
        pending.current = null;
        try {
          const payload = await responseJson(await fetch('/api/profile/state', {
            method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...state, expectedVersion: version.current }),
          }));
          version.current = payload.data?.version || version.current;
        } catch (error) {
          if (error.code === 'PROFILE_VERSION_CONFLICT') {
            const latest = await fetch('/api/profile/state', { credentials: 'include' }).then(responseJson).catch(() => null);
            version.current = latest?.data?.version || version.current;
            showToast('画像在其他窗口或设备发生变化，本次修改未覆盖远端数据');
          } else {
            showToast(`画像未保存：${error.message}`);
          }
          break;
        }
      }
    } finally {
      saving.current = false;
      if (pending.current) queueMicrotask(() => drain.current?.());
    }
  };

  useEffect(() => {
    clearTimeout(timer.current);
    pending.current = null;
    if (!user?.id) { hydratedUser.current = ''; version.current = null; return undefined; }
    if (hydratedUser.current === user.id) return undefined;
    let cancelled = false;
    fetch('/api/profile/state', { credentials: 'include' }).then(responseJson).then(payload => {
      if (cancelled) return;
      const state = payload.data || {};
      version.current = state.version || 1;
      if ((state.domains?.length || state.sources?.length || state.specialFollows?.length) > 0) {
        skipSave.current = true;
        setDomainTiers(tierMap(state.domains));
        setSourceTiers(tierMap(state.sources));
        setSpecialFollows(state.specialFollows || []);
      }
      hydratedUser.current = user.id;
    }).catch(error => {
      if (!cancelled) showToast(`画像加载失败：${error.message}`);
    });
    return () => { cancelled = true; };
  }, [user?.id, setDomainTiers, setSourceTiers, setSpecialFollows]);

  useEffect(() => {
    if (!user?.id || hydratedUser.current !== user.id) return undefined;
    if (skipSave.current) { skipSave.current = false; return undefined; }
    pending.current = { domainTiers, sourceTiers, specialFollows };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => drain.current?.(), 600);
    return () => clearTimeout(timer.current);
  }, [user?.id, domainTiers, sourceTiers, specialFollows]);
}
