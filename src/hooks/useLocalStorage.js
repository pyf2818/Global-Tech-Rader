import { useState, useCallback } from 'react';
import { loadLS, saveLS } from '../utils/localStorage.js';

/**
 * useState that auto-syncs to localStorage.
 * Replaces the repetitive useState + useEffect(saveLS) pattern.
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => loadLS(key, initialValue));

  const setStoredValue = useCallback((newValue) => {
    setValue(prev => {
      const resolved = typeof newValue === 'function' ? newValue(prev) : newValue;
      saveLS(key, resolved);
      return resolved;
    });
  }, [key]);

  return [value, setStoredValue];
}
