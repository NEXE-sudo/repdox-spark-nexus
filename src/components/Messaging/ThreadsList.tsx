import React from 'react';

export type ThreadSummary = {
  id: string;
  title: string;
  last_message: string;
  updated_at: string;
  unread_count?: number;
};

type Props = {
  threads: ThreadSummary[];
  selectedId?: string;
  onSelect: (id: string) => void;
};

export default function ThreadsList({ threads, selectedId, onSelect }: Props) {
  return (
    <aside className="w-80 border-r border-gray-200 p-4">
      <h2 className="text-lg font-semibold mb-4">Messages</h2>
      <ul className="space-y-2">
        {threads.map((t) => (
          <li
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`p-3 rounded cursor-pointer hover:bg-gray-50 ${selectedId === t.id ? 'bg-gray-100' : ''}`}
            aria-current={selectedId === t.id}
          >
            <div className="flex justify-between">
              <div className="font-medium">{t.title}</div>
              <div className="text-xs text-gray-500">{new Date(t.updated_at).toLocaleTimeString()}</div>
            </div>
            <div className="text-sm text-gray-600 truncate">{t.last_message}</div>
          </li>
        ))}
      </ul>
    </aside>
  );
}
