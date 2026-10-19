export function SearchHighlight({ text, query }: { text: string; query: string }) {
  const words = [...new Set(query.trim().split(/[\s+\-]+/).filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!words.length) return <>{text}</>;
  const escaped = words.map(word => word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const pattern = new RegExp(`(${escaped.join('|')})`, 'gi');
  return <>{text.split(pattern).map((part, index) => index % 2 ? <mark key={index} className="bg-amber-100 text-inherit dark:bg-amber-900/50">{part}</mark> : part)}</>;
}
