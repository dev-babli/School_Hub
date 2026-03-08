'use client';

import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import NextLink from 'next/link';
import { Link } from '@chakra-ui/react';

export default function AttendancePage() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text color={textColor} fontSize="2xl" fontWeight="700">Attendance</Text>
      <Text color="secondaryGray.600" mt="8px">
        Smart WhatsApp attendance features (Face Recognition, biometric scan) available from{' '}
        <Link as={NextLink} href="/admin/demo-setup" color="brand.500">
          Demo Setup
        </Link>{' '}
        and{' '}
        <Link as={NextLink} href="/admin/face" color="brand.500">
          Face
        </Link>.
      </Text>
    </Box>
  );
}
