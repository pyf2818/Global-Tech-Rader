import { useEffect, useRef } from 'react';

function tierMap(rows) { return Object.fromEntries((rows || []).map(row => [row.id, row.tier])); }

export function useProfileSync({ user, domainTiers, sourceTiers, specialFollows, setDomainTiers, setSourceTiers, setSpecialFollows }) {
  const hydratedUser = useRef('');
  const skipSave = useRef(false);

  useEffect(() => {
    if (!user?.id) { hydratedUser.current = ''; return undefined; }
    if (hydratedUser.current === user.id) return undefined;
    let cancelled = false;
    fetch('/api/profile/state', { credentials: 'include' }).then(response => response.ok ? response.json() : null).then(payload => {
      if (cancelled || !payload?.ok) return;
      const state = payload.data || {};
      if ((state.domains?.length || state.sources?.length || state.specialFollows?.length) > 0) {
        skipSave.current = true;
        setDomainTiers(tierMap(state.domains));
        setSourceTiers(tierMap(state.sources));
        setSpecialFollows(state.specialFollows || []);
      }
      hydratedUser.current = user.id;
    }).catch(() => { hydratedUser.current = user.id; });
    return () => { cancelled = true; };
  }, [user?.id, setDomainTiers, setSourceTiers, setSpecialFollows]);

  useEffect(() => {
    if (!user?.id || hydratedUser.current !== user.id) return undefined;
    if (skipSave.current) { skipSave.current = false; return undefined; }
    const timer = setTimeout(() => {
      fetch('/api/profile/state', {
        method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domainTiers, sourceTiers, specialFollows }),
      }).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [user?.id, domainTiers, sourceTiers, specialFollows]);
}
