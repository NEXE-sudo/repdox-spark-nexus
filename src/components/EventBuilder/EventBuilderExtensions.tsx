"use client"

import React, { useMemo } from 'react';
import LivePreview, { EventDraft } from './LivePreview';
import ReorderableSections, { Section } from './ReorderableSections';
import CalmProgress from '../ui/CalmProgress';
import useAutoSave from '@/hooks/useAutoSave';

export default function EventBuilderExtensions({ draft, onChange }: { draft: EventDraft; onChange: (d: EventDraft) => void }) {
  const key = useMemo(() => `event-draft:${draft.id ?? 'new'}`, [draft.id]);

  const { state: saveState, load, manualSave, clear } = useAutoSave<EventDraft>(key, draft, { debounceMs: 700 });

  const sections = draft.sections ?? [];

  const onReorder = (s: Section[]) => {
    onChange({ ...draft, sections: s });
    manualSave();
  };

  const progress = useMemo(() => {
    // calm progress based on fields filled (simple heuristic)
    const total = 6;
    let filled = 0;
    if (draft.title && draft.title.trim()) filled++;
    if (draft.description && draft.description.trim()) filled++;
    if (draft.date) filled++;
    if (draft.location) filled++;
    if (draft.cover) filled++;
    if (draft.sections && draft.sections.length) filled++;
    return Math.round((filled / total) * 100);
  }, [draft]);

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm text-neutral-500">Draft status: <span className="font-medium text-neutral-700">{saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'Saved' : saveState}</span></div>
          <div className="mt-2"><CalmProgress progress={progress} /></div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => manualSave()} className="px-3 py-2 rounded-md bg-neutral-100 dark:bg-neutral-900">Save now</button>
          <button onClick={() => { clear(); }} className="px-3 py-2 rounded-md bg-neutral-50 dark:bg-neutral-800">Clear draft</button>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-4 text-sm font-medium">Sections</div>
          <ReorderableSections sections={sections as Section[]} onChange={onReorder} />
        </div>

        {/* Preview is handled by the page when space allows (sticky panel on desktop) */}
      </div>
    </div>
  );
}
