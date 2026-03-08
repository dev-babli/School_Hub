'use client';

import { Box, Button, Heading, Text } from '@chakra-ui/react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <Box
          minH="100vh"
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          gap={4}
          px={6}
        >
          <Heading size="lg">Application error</Heading>
          <Text color="gray.500" maxW="lg" textAlign="center">
            {error.message || 'An unexpected error occurred in the application.'}
          </Text>
          <Button onClick={reset} colorScheme="brand">
            Try again
          </Button>
        </Box>
      </body>
    </html>
  );
}

