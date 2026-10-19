import { useSearchParams } from 'react-router-dom';
import { useSessionState } from './useSessionState';

export function useRecordSelection<T extends string | null>(key: string, initialValue: T) {
  const [params, setParams] = useSearchParams();
  const [saved, setSaved] = useSessionState<T>(`selection:${key}`, initialValue);
  const value = params.has(key) ? (params.get(key) || null) as T : saved;
  const select = (next: T) => {
    setSaved(next);
    const search = new URLSearchParams(params);
    search.set(key, next ?? '');
    setParams(search);
  };
  return [value, select] as const;
}
