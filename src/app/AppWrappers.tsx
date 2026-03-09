'use client';
import React, { ReactNode } from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import theme from '../theme/theme';
import { AuthProvider } from 'contexts/AuthContext';

export default function AppWrappers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <ChakraProvider theme={theme}>{children}</ChakraProvider>
    </AuthProvider>
  );
}
