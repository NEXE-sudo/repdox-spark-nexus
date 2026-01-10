"use client"

import React from 'react';
import { motion } from 'framer-motion';

export type EventDraft = {
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  location?: string;
  cover?: string;
  tags?: string[];
  sections?: Array<{ id: string; type: string; title?: string; content?: unknown }>;
};

export default function LivePreview({ draft }: { draft: EventDraft }) {
  const parseAgenda = (content?: unknown) => {
    if (!content || typeof content !== 'string') return [] as Array<{ time?: string; title?: string; description?: string }>;
    const text = content as string;
    return text.split('\n').map((line) => {
      const parts = line.split('|').map((p) => p.trim());
      return { time: parts[0] || '', title: parts[1] || '', description: parts[2] || '' };
    });
  };

  const parseJson = <T,>(c: unknown): T[] => {
    if (!c) return [] as T[];
    try {
      return typeof c === 'string' ? JSON.parse(c) : (c as T[]);
    } catch {
      return [] as T[];
    }
  };

  return (
    <div className="p-4">
      <motion.div layout className="rounded-lg bg-white dark:bg-[#0d0f12] shadow-card overflow-hidden">
        {/* Event header */}
        <div className="w-full h-44 bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center overflow-hidden">
          {draft.cover ? (
            <img src={draft.cover} alt="cover" className="object-cover w-full h-full" />
          ) : (
            <div className="text-neutral-400">No cover image</div>
          )}
        </div>

        <div className="p-5">
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">{draft.title || 'Untitled event'}</h1>
          <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{draft.date ?? 'No date set'} · {draft.location ?? 'No location'}</div>

          <div className="mt-4 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{draft.description || 'No description yet — use the editor to craft a full description.'}</div>

          <div className="mt-4 flex flex-wrap gap-2">
            {(draft.tags || []).map((t) => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700">{t}</span>
            ))}
          </div>
        </div>

        <div className="border-t border-neutral-100/80 dark:border-neutral-800 p-5">
          {/* Render sections fully */}
          {draft.sections && draft.sections.length > 0 ? (
            <div className="space-y-6">
              {draft.sections.map((s) => {
                switch (s.type) {
                  case 'Agenda': {
                    const items = parseAgenda(s.content);
                    return (
                      <section key={s.id}>
                        <h3 className="text-lg font-semibold">{s.title || 'Agenda'}</h3>
                        <ul className="mt-2 space-y-2">
                          {items.map((it, i) => (
                            <li key={i} className="flex gap-3 items-start">
                              <div className="text-xs w-28 text-neutral-600 dark:text-neutral-400">{it.time}</div>
                              <div>
                                <div className="font-medium">{it.title}</div>
                                {it.description && <div className="text-sm text-neutral-600 dark:text-neutral-400">{it.description}</div>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  }

                  case 'FAQs': {
                    const faqs = parseJson<{ question?: string; answer?: string }>(s.content);
                    return (
                      <section key={s.id}>
                        <h3 className="text-lg font-semibold">{s.title || 'FAQs'}</h3>
                        <div className="mt-2 space-y-2">
                          {faqs.map((f, i) => (
                            <details key={i} className="bg-muted/20 rounded-md p-3">
                              <summary className="font-medium cursor-pointer">{f.question || 'Question'}</summary>
                              <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{f.answer}</div>
                            </details>
                          ))}
                        </div>
                      </section>
                    );
                  }

                  case 'Speakers': {
                    const sp = parseJson<{ name?: string; role?: string }>(s.content);
                    return (
                      <section key={s.id}>
                        <h3 className="text-lg font-semibold">{s.title || 'Speakers'}</h3>
                        <div className="mt-3 grid grid-cols-1 gap-3">
                          {sp.map((p, i) => (
                            <div key={i} className="p-3 rounded-md bg-neutral-50 dark:bg-neutral-900">
                              <div className="font-medium">{p.name}</div>
                              <div className="text-xs text-neutral-600 dark:text-neutral-400">{p.role}</div>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  }

                  case 'Resources': {
                    const res = parseJson<{ title?: string; link?: string }>(s.content);
                    return (
                      <section key={s.id}>
                        <h3 className="text-lg font-semibold">{s.title || 'Resources'}</h3>
                        <ul className="mt-2 list-disc pl-5 space-y-1">
                          {res.map((r, i) => (
                            <li key={i}>
                              {r.link ? (
                                <a className="text-accent underline" href={r.link} target="_blank" rel="noreferrer">{r.title || r.link}</a>
                              ) : (
                                <span>{r.title}</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </section>
                    );
                  }

                  default:
                    return (
                      <section key={s.id}>
                        <h3 className="text-lg font-semibold">{s.title || s.type}</h3>
                        <div className="mt-2 text-sm text-neutral-600 dark:text-neutral-400 whitespace-pre-wrap">{typeof s.content === 'string' ? s.content : JSON.stringify(s.content)}</div>
                      </section>
                    );
                }
              })}
            </div>
          ) : (
            <div className="text-sm text-neutral-500">No additional sections added yet.</div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
