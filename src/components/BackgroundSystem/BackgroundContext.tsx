import React from "react";

export const BackgroundProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return <>{children}</>;
};

export const useBackground = () => {
  return {
    semanticMode: "scanning" as const,
    focusState: "active" as const,
    setSemanticMode: () => {},
  };
};
