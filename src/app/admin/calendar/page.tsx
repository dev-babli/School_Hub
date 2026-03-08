'use client';

import { Box, Text, useColorModeValue } from '@chakra-ui/react';

export default function CalendarPage() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text color={textColor} fontSize="2xl" fontWeight="700">Calendar</Text>
      <Text color="secondaryGray.600" mt="8px">View school calendar and events.</Text>
    </Box>
  );
}
