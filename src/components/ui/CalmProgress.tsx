"use client"

import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

export default function CalmProgress({ progress = 0 }: { progress?: number }) {
  const reduce = useReducedMotion();

  return (
    <div className="w-full h-1 bg-neutral-100 dark:bg-neutral-900 rounded overflow-hidden">
      <motion.div
        initial={false}
        animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        transition={{ duration: reduce ? 0 : 0.5, ease: 'easeOut' }}
        className="h-full bg-gradient-to-r from-accent-400 to-accent-600"
      />
    </div>
  );
}
