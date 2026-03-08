'use client';

import { Box, Text, List, ListItem, ListIcon, useColorModeValue } from '@chakra-ui/react';
import Card from 'components/card/Card';
import { MdCheckCircle, MdInfoOutline } from 'react-icons/md';
import { Icon } from '@chakra-ui/react';

export default function EnrollmentInfoCard() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');

  return (
    <Card p="0" w="100%" overflow="hidden">
      <Box
        w="100%"
        px="20px"
        py="16px"
        borderBottom="1px solid"
        borderColor={borderColor}
        display="flex"
        alignItems="center"
        gap="2"
      >
        <Icon as={MdInfoOutline} w="20px" h="20px" color="blue.500" />
        <Text color={textColor} fontSize="md" fontWeight="600">
          Face Tracking & Enrollment
        </Text>
      </Box>
      <Box px="20px" py="16px">
        <Text fontSize="sm" color={textColor} mb="3">
          How it works:
        </Text>
        <List spacing="2" fontSize="sm" color="gray.600">
          <ListItem display="flex" alignItems="flex-start" gap="2">
            <ListIcon as={MdCheckCircle} color="green.500" mt="0.5" />
            <span><strong>Registered faces</strong> — When a known (enrolled) face is detected, attendance is marked once and WhatsApp is sent.</span>
          </ListItem>
          <ListItem display="flex" alignItems="flex-start" gap="2">
            <ListIcon as={MdCheckCircle} color="green.500" mt="0.5" />
            <span><strong>New faces</strong> — If an unknown face appears, it is analysed, auto-enrolled with a new ID (e.g. Guest_2), and marked present. Only registered faces get attendance.</span>
          </ListItem>
          <ListItem display="flex" alignItems="flex-start" gap="2">
            <ListIcon as={MdCheckCircle} color="green.500" mt="0.5" />
            <span><strong>Enroll with a name</strong> — Use the <strong>Enroll Face</strong> card on this dashboard (&quot;Start enrollment&quot; button) or run <code style={{ background: 'var(--chakra-colors-gray-100)', padding: '2px 6px', borderRadius: '4px' }}>py enroll_face.py</code> from the <code style={{ background: 'var(--chakra-colors-gray-100)', padding: '2px 6px', borderRadius: '4px' }}>face-recognition-poc</code> folder to scan, analyse, and add a face with a specific name (e.g. Soumeet, ID 1).</span>
          </ListItem>
          <ListItem display="flex" alignItems="flex-start" gap="2">
            <ListIcon as={MdCheckCircle} color="green.500" mt="0.5" />
            <span><strong>Same camera</strong> — All scripts use the same camera (saved in <code>camera_config.json</code>).</span>
          </ListItem>
        </List>
      </Box>
    </Card>
  );
}
