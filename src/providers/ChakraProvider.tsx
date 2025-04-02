
import React from 'react';

// Simple pass-through provider that doesn't use Chakra UI
export const ChakraProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};
