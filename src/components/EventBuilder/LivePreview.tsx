"use client"

import React from 'react';
import { motion } from 'framer-motion';

export type EventDraft = {
  id?: string;
  title?: string;
  description?: string;
  date?: string;
  start_at?: string;
  end_at?: string;
  location?: string;
  cover?: string;
  tags?: string[];
  type?: string;
  registration_start?: string;
  registration_end?: string;
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

        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-2 flex gap-2">
                 {draft.type && <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-purple-600 text-white hover:bg-purple-700">{draft.type}</div>}
              </div>
              <h1 className="text-3xl font-extrabold text-neutral-900 dark:text-neutral-100 leading-tight">{draft.title || 'Untitled Event'}</h1>
            </div>
          </div>
          
          <div className="mt-4 flex flex-col gap-3 text-sm text-neutral-600 dark:text-neutral-300">
             <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-calendar"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg></div>
                <span className="font-medium">
                  {draft.date ? new Date(draft.date).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : 'Date & Time'}
                  {draft.end_at && ` - ${new Date(draft.end_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                </span>
             </div>
             
             <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-neutral-100 dark:bg-neutral-800"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-map-pin"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg></div>
                <span>{draft.location || 'Location / URL'}</span>
             </div>

             {/* Registration Dates */}
             {(draft.registration_start || draft.registration_end) && (
                <div className="mt-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 text-xs">
                   <div className="font-semibold text-orange-700 dark:text-orange-300 mb-1">Registration</div>
                   <div className="grid grid-cols-2 gap-4">
                      {draft.registration_start && (
                        <div>
                          <div className="text-orange-600/70 dark:text-orange-400/70 uppercase tracking-wider text-[10px]">Opens</div>
                          <div className="text-orange-800 dark:text-orange-200">{new Date(draft.registration_start).toLocaleDateString()}</div>
                        </div>
                      )}
                      {draft.registration_end && (
                        <div>
                          <div className="text-orange-600/70 dark:text-orange-400/70 uppercase tracking-wider text-[10px]">Closes</div>
                          <div className="text-orange-800 dark:text-orange-200">{new Date(draft.registration_end).toLocaleDateString()}</div>
                        </div>
                      )}
                   </div>
                </div>
             )}
          </div>

          <div className="mt-6 text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">{draft.description || 'No description yet — use the editor to craft a full description.'}</div>

          <div className="mt-6 flex flex-wrap gap-2">
            {(draft.tags || []).map((t) => (
              <span key={t} className="text-xs px-2.5 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-700 font-medium">{t}</span>
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

                  case 'Committees': {
                    const committees = (typeof s.content === 'string' ? s.content : '').split('\n').filter(Boolean);
                    return (
                       <section key={s.id}>
                         <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                            {s.title || 'Committees'}
                         </h3>
                         <div className="grid gap-3 sm:grid-cols-2">
                           {committees.map((c, i) => {
                             const parts = c.split('|');
                             return (
                               <div key={i} className="p-3 rounded-lg border bg-card/50">
                                 <div className="font-semibold">{parts[0]}</div>
                                 <div className="text-xs text-muted-foreground mt-1">{parts[1]}</div>
                                 {parts[2] && <div className="text-[10px] uppercase tracking-wider font-bold text-purple-600 mt-2">{parts[2].trim()}</div>}
                               </div>
                             )
                           })}
                         </div>
                       </section>
                    );
                  }

                  case 'Teams': 
                  case 'Roles': {
                     const lines = (typeof s.content === 'string' ? s.content : '').split('\n').filter(Boolean);
                     return (
                        <section key={s.id}>
                          <h3 className="text-lg font-semibold mb-3">{s.title || s.type}</h3>
                          <ul className="space-y-2">
                             {lines.map((l, i) => {
                                const parts = l.split('|');
                                return (
                                  <li key={i} className="flex justify-between items-center p-3 rounded bg-muted/30">
                                    <div>
                                      <div className="font-medium">{parts[0]}</div>
                                      <div className="text-xs text-muted-foreground">{parts[1]}</div>
                                    </div>
                                    {parts[2] && <div className="text-xs font-mono bg-muted p-1 px-2 rounded opacity-70">{parts[2]}</div>}
                                  </li>
                                )
                             })}
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
