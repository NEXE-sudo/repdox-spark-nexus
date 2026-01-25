"use client"

import React from 'react';

export type Section = { id: string; type: string; title?: string; content?: any };

export default function ReorderableSections({ sections, onChange }: { sections: Section[]; onChange: (s: Section[]) => void }) {
  // HTML5 drag/drop implementation with accessible keyboard fallbacks

  const onDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDrop = (e: React.DragEvent, overId: string) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (!id) return;
    if (id === overId) return;

    const fromIndex = sections.findIndex((x) => x.id === id);
    const toIndex = sections.findIndex((x) => x.id === overId);
    if (fromIndex === -1 || toIndex === -1) return;

    const next = [...sections];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    onChange(next);
  };

  const onDragOver = (e: React.DragEvent) => e.preventDefault();

  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= sections.length) return;
    const next = [...sections];
    const [moved] = next.splice(i, 1);
    next.splice(j, 0, moved);
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {sections.map((s, i) => (
        <div
          key={s.id}
          draggable
          onDragStart={(e) => onDragStart(e, s.id)}
          onDragOver={onDragOver}
          onDrop={(e) => onDrop(e, s.id)}
          className="relative flex items-start gap-3 rounded-md border border-neutral-100/60 dark:border-neutral-800 p-3 bg-white dark:bg-[#0f1113]"
          aria-roledescription={`Draggable ${s.type} section`}
          tabIndex={0}
        >
          <div className="flex-1">
            <div className="text-sm font-medium text-neutral-800 dark:text-neutral-100">{s.title || s.type}</div>
            <div className="text-xs text-neutral-500">{typeof s.content === 'string' ? s.content.slice(0, 140) : ''}</div>
          </div>

          <div className="flex flex-col gap-2">
            <button aria-label={`Move ${s.type} up`} title={`Move up`} className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => move(i, -1)}>&uarr;</button>
            <button aria-label={`Move ${s.type} down`} title={`Move down`} className="p-2 rounded-md hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => move(i, 1)}>&darr;</button>
          </div>
        </div>
      ))}
    </div>
  );
}
