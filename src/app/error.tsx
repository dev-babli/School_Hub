'use client';

import { Box, Button, Heading, Text } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  return (
    <Box
      minH="100vh"
      display="flex"
      flexDirection="column"
      alignItems="center"
      justifyContent="center"
      gap={4}
      px={6}
    >
      <Heading size="lg">Something went wrong</Heading>
      <Text color="gray.500" maxW="lg" textAlign="center">
        {error.message || 'An unexpected error occurred while loading this page.'}
      </Text>
      <Box display="flex" gap={3} mt={2}>
        <Button onClick={reset} colorScheme="brand">
          Try again
        </Button>
        <Button variant="outline" onClick={() => router.push('/auth/login')}>
          Go to login
        </Button>
      </Box>
    </Box>
  );
}

