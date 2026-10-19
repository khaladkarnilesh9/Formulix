import { useEffect, useState } from 'react';

export function useSessionState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem(`formulix:${key}`);
      return saved === null ? initialValue : JSON.parse(saved) as T;
    } catch { return initialValue; }
  });
  useEffect(() => {
    try { sessionStorage.setItem(`formulix:${key}`, JSON.stringify(value)); } catch { /* Storage may be disabled. */ }
  }, [key, value]);
  return [value, setValue] as const;
}
