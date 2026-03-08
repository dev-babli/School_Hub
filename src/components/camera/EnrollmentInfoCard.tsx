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
            <span><strong>Simple flow:</strong> Enroll one face → run attendance → when that face appears, green box + name + WhatsApp once per day.</span>
          </ListItem>
          <ListItem display="flex" alignItems="flex-start" gap="2">
            <ListIcon as={MdCheckCircle} color="green.500" mt="0.5" />
            <span><strong>Enroll</strong> — Use <strong>Enroll Face</strong> card or run <code>py enroll_face.py</code>. Name the person. Saves to known_faces.</span>
          </ListItem>
          <ListItem display="flex" alignItems="flex-start" gap="2">
            <ListIcon as={MdCheckCircle} color="green.500" mt="0.5" />
            <span><strong>Run attendance</strong> — <code>py attendance_poc.py</code>. Stream with green box + name appears above. WhatsApp sent once per person per day.</span>
          </ListItem>
          <ListItem display="flex" alignItems="flex-start" gap="2">
            <ListIcon as={MdCheckCircle} color="green.500" mt="0.5" />
            <span><strong>New client?</strong> — Click <strong>Clear all</strong> in Enrolled Faces, then enroll the new person.</span>
          </ListItem>
        </List>
      </Box>
    </Card>
  );
}
