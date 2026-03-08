'use client';

import { Box, Text, useColorModeValue } from '@chakra-ui/react';

export default function LibraryPage() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Text color={textColor} fontSize="2xl" fontWeight="700">Library</Text>
      <Text color="secondaryGray.600" mt="8px">Manage library books and borrowing.</Text>
    </Box>
  );
}
