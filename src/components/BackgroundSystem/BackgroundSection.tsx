import React, { useEffect } from 'react';
import { useInView } from 'react-intersection-observer';
import { useBackground, SemanticMode } from './BackgroundContext';

interface BackgroundSectionProps {
  children: React.ReactNode;
  semanticMode: SemanticMode;
  className?: string;
}

export const BackgroundSection: React.FC<BackgroundSectionProps> = ({
  children,
  semanticMode,
  className = '',
}) => {
  const { setSemanticMode } = useBackground();
  const { ref, inView } = useInView({
    threshold: 0.4, // Balanced sensitivity
  });

  useEffect(() => {
    if (inView) {
      setSemanticMode(semanticMode);
    }
  }, [inView, semanticMode, setSemanticMode]);

  return (
    <div ref={ref} className={`relative z-10 ${className}`}>
      {children}
    </div>
  );
};

export default BackgroundSection;
