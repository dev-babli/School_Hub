'use client';

import {
  Box,
  Button,
  Flex,
  Input,
  InputGroup,
  InputLeftAddon,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import { MdPlayArrow } from 'react-icons/md';
import { Icon } from '@chakra-ui/react';
import { useCallback, useState } from 'react';

export default function EnrollFaceCard() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const codeBg = useColorModeValue('gray.100', 'whiteAlpha.100');
  const toast = useToast();
  const [starting, setStarting] = useState(false);
  const [enrollName, setEnrollName] = useState('');
  const [enrollPhone, setEnrollPhone] = useState(
    () => (typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_DEMO_PHONE || '' : '')
  );

  const onCopyCommand = useCallback(async () => {
    const cmd = 'cd D:\\\\Softree_Projects\\\\Whatsapp\\\\face-recognition-poc && py enroll_face.py';
    try {
      await navigator.clipboard.writeText(cmd);
      toast({
        title: 'Command copied',
        description: 'Paste in PowerShell/Terminal to run face enrollment.',
        status: 'success',
        duration: 4000,
        isClosable: true,
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Copy this command manually:\n' + cmd,
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    }
  }, [toast]);

  const onStartScript = useCallback(async () => {
    setStarting(true);
    try {
      const body: { name?: string; phone?: string } = {};
      if (enrollName.trim()) body.name = enrollName.trim();
      if (enrollPhone.trim()) body.phone = enrollPhone.trim();
      const res = await fetch('/api/enroll-face', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast({
          title: 'Could not start enroll script',
          description:
            data?.error ??
            'Check that Python is installed, the py launcher works, and the project folder is on a local disk.',
          status: 'error',
          duration: 6000,
          isClosable: true,
        });
        return;
      }
      toast({
        title: 'Enroll script started',
        description: 'Look at the DroidCam feed; a Python window will scan and enroll your face.',
        status: 'success',
        duration: 6000,
        isClosable: true,
      });
    } catch (e) {
      toast({
        title: 'Network error',
        description: 'Could not call /api/enroll-face from the browser.',
        status: 'error',
        duration: 6000,
        isClosable: true,
      });
    } finally {
      setStarting(false);
    }
  }, [toast, enrollName, enrollPhone]);

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
        <Icon as={MdPlayArrow} w="20px" h="20px" color="green.400" />
        <Text color={textColor} fontSize="md" fontWeight="600">
          Enroll Face (Python Script)
        </Text>
      </Box>
      <Box px="20px" py="16px">
        <Flex direction="column" gap="3">
          <Text fontSize="sm" color={textColor}>
            Starts the local <code>enroll_face.py</code> script. Enter name and parent WhatsApp number
            (optional), then look at the camera when the Python window opens.
          </Text>
          <Flex gap="3" flexWrap="wrap">
            <InputGroup size="sm" maxW="200px">
              <InputLeftAddon>Name</InputLeftAddon>
              <Input
                placeholder="Student name"
                value={enrollName}
                onChange={(e) => setEnrollName(e.target.value)}
              />
            </InputGroup>
            <InputGroup size="sm" maxW="220px">
              <InputLeftAddon>Phone</InputLeftAddon>
              <Input
                placeholder="919876543210"
                value={enrollPhone}
                onChange={(e) => setEnrollPhone(e.target.value)}
              />
            </InputGroup>
          </Flex>
          <Box
            as="code"
            fontSize="xs"
            borderRadius="md"
            px="3"
            py="2"
            bg={codeBg}
            whiteSpace="pre-wrap"
          >
            cd D:\Softree_Projects\Whatsapp\face-recognition-poc && py enroll_face.py
          </Box>
          <Flex gap="2" wrap="wrap">
            <Button
              size="sm"
              colorScheme="brand"
              leftIcon={<Icon as={MdPlayArrow} />}
              onClick={onStartScript}
              isLoading={starting}
            >
              Start enrollment
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onCopyCommand}
            >
              Copy command
            </Button>
          </Flex>
        </Flex>
      </Box>
    </Card>
  );
}

