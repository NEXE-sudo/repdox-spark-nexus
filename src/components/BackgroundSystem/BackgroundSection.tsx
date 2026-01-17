import React from "react";

interface BackgroundSectionProps {
  children: React.ReactNode;
  className?: string;
}

export const BackgroundSection: React.FC<BackgroundSectionProps> = ({
  children,
  className = "",
}) => {
  return <div className={`relative z-10 ${className}`}>{children}</div>;
};

export default BackgroundSection;
