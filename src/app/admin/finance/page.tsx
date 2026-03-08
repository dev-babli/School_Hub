'use client';

import { Box, Text, useColorModeValue } from '@chakra-ui/react';

export default function FinancePage() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text color={textColor} fontSize="2xl" fontWeight="700">Finance</Text>
      <Text color="secondaryGray.600" mt="8px">Manage fees, payroll, and financial reports.</Text>
    </Box>
  );
}
