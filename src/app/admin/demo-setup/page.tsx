'use client';

import { Box, Button, Flex, Link, Text, useColorModeValue } from '@chakra-ui/react';
import DemoSetupCard from 'components/demo/DemoSetupCard';
import NextLink from 'next/link';

export default function DemoSetupPage() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text color={textColor} fontSize="2xl" fontWeight="700" mb="24px">
        Demo Setup
      </Text>
      <Text fontSize="sm" color="gray.500" mb="20px">
        Follow these steps to run a polished demo for your clients. Ensure the Python attendance
        engine is running and recipients have joined the Twilio sandbox.
      </Text>
      <Box maxW="600px" mb="20px">
        <DemoSetupCard />
      </Box>
      <Flex gap="4" mt="6">
        <Button as={NextLink} href="/admin/dashboard" colorScheme="brand" size="lg">
          Go to Dashboard (Live Event Log)
        </Button>
        <Button as={NextLink} href="/admin/face" variant="outline" size="lg">
          Face Recognition
        </Button>
      </Flex>
    </Box>
  );
}
