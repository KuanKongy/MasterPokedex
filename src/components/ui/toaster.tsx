
import React from 'react';
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster 
      position="top-right"
      toastOptions={{
        duration: 3000,
      }}
    />
  );
}
