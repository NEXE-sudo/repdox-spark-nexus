'use client';

import { useState, useEffect } from 'react';

export default function IntroLoader({ onComplete }: { onComplete: () => void }) {
  const [stage, setStage] = useState('enter');

  useEffect(() => {
    const enterTimer = setTimeout(() => setStage('hold'), 100);
    const holdTimer = setTimeout(() => setStage('exit'), 2000);
    const exitTimer = setTimeout(onComplete, 4000);

    return () => {
      clearTimeout(enterTimer);
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`intro-loader ${stage}`}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
        transition: 'opacity 600ms cubic-bezier(0.4, 0.0, 0.2, 1)',
        opacity: stage === 'exit' ? 0 : 1,
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '4rem',
            fontWeight: '600',
            color: '#ffffff',
            margin: 0,
            transform: stage === 'enter' ? 'translateY(100%)' : 'translateY(0)',
            opacity: stage === 'exit' ? 0 : 1,
            transition: 'all 800ms cubic-bezier(0.4, 0.0, 0.2, 1)',
          }}
        >
          Repdox
        </h1>
        
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '2rem' }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '40px',
                height: '4px',
                backgroundColor: '#8B5CF6',
                borderRadius: '2px',
                transform: stage === 'enter' || stage === 'exit' ? 'scaleX(0)' : 'scaleX(1)',
                opacity: stage === 'exit' ? 0 : 1,
                transition: `all 600ms cubic-bezier(0.4, 0.0, 0.2, 1) ${i * 100}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}