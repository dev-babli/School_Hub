'use client';

import {
  Badge,
  Box,
  Button,
  Flex,
  Input,
  Link,
  Spinner,
  Text,
  useColorModeValue,
  useToast,
  Image,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import { Icon } from '@chakra-ui/react';
import { MdCheckCircle, MdError, MdSettings, MdSend, MdWarning } from 'react-icons/md';
import { useCallback, useEffect, useState } from 'react';

const SANDBOX_NUMBER = '+1 415 523 8886';
const SANDBOX_JOIN_PHRASE =
  typeof window !== 'undefined'
    ? (process.env.NEXT_PUBLIC_TWILIO_SANDBOX_JOIN_PHRASE || 'worth-on')
    : 'worth-on';
const SANDBOX_JOIN_LINK = `https://wa.me/14155238886?text=${encodeURIComponent(
  `join ${SANDBOX_JOIN_PHRASE}`,
)}`;

export default function DemoSetupCard() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const successColor = useColorModeValue('green.600', 'green.400');
  const errorColor = useColorModeValue('red.600', 'red.400');
  const warnColor = useColorModeValue('orange.500', 'orange.400');
  const toast = useToast();

  const [pythonOk, setPythonOk] = useState<boolean | null>(null);
  const [testPhone, setTestPhone] = useState('');
  const [testing, setTesting] = useState(false);
  const [whatsappOk, setWhatsappOk] = useState<boolean | null>(null);
  const [enrolledCount, setEnrolledCount] = useState<number | null>(null);

  const checkPython = useCallback(async () => {
    try {
      const res = await fetch('/api/camera-stream?check=1');
      const data = await res.json();
      setPythonOk(data?.available === true);
    } catch {
      setPythonOk(false);
    }
  }, []);

  const checkEnrolledFaces = useCallback(async () => {
    try {
      const res = await fetch('/api/enrolled-faces');
      const data = await res.json();
      const count = Array.isArray(data?.students) ? data.students.length : 0;
      setEnrolledCount(count);
    } catch {
      setEnrolledCount(0);
    }
  }, []);

  useEffect(() => {
    checkPython();
    checkEnrolledFaces();
    const t = setInterval(() => {
      checkPython();
      checkEnrolledFaces();
    }, 10000);
    return () => clearInterval(t);
  }, [checkPython, checkEnrolledFaces]);

  const defaultPhone =
    typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_DEMO_PHONE || '' : '';
  const phoneToUse = testPhone.trim() || defaultPhone;

  const onTestSend = useCallback(async () => {
    if (!phoneToUse) {
      toast({ title: 'Enter a phone number first', status: 'warning', isClosable: true });
      return;
    }
    setTesting(true);
    setWhatsappOk(null);
    try {
      const res = await fetch('/api/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phoneToUse,
          message: '🟢 Test: Smart Attendance demo – WhatsApp is working!',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setWhatsappOk(true);
        toast({
          title: 'Message sent',
          description: `WhatsApp delivered to ${phoneToUse}`,
          status: 'success',
          isClosable: true,
        });
      } else {
        setWhatsappOk(false);
        toast({
          title: 'Send failed',
          description: data?.error || 'Ask client to send join ' + SANDBOX_JOIN_PHRASE + ' to ' + SANDBOX_NUMBER,
          status: 'error',
          duration: 10000,
          isClosable: true,
        });
      }
    } catch (e) {
      setWhatsappOk(false);
      toast({
        title: 'Request failed',
        description: e instanceof Error ? e.message : 'Network error',
        status: 'error',
        isClosable: true,
      });
    } finally {
      setTesting(false);
    }
  }, [phoneToUse, toast]);

  const allPreflightOk = pythonOk === true && whatsappOk === true && enrolledCount !== null && enrolledCount > 0;

  const StatusRow = ({
    label,
    ok,
    loading,
  }: {
    label: string;
    ok: boolean | null;
    loading?: boolean;
  }) => (
    <Flex align="center" gap="2" py="1">
      {loading ? (
        <Spinner size="sm" />
      ) : ok ? (
        <Icon as={MdCheckCircle} color={successColor} boxSize="5" />
      ) : (
        <Icon as={MdError} color={errorColor} boxSize="5" />
      )}
      <Text fontSize="sm" color={textColor}>
        {label}: {loading ? 'Checking…' : ok ? 'OK' : 'Not connected'}
      </Text>
    </Flex>
  );

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
        justifyContent="space-between"
        flexWrap="wrap"
        gap="2"
      >
        <Flex align="center" gap="2">
          <Icon as={MdSettings} w="20px" h="20px" color="brand.500" />
          <Text color={textColor} fontSize="md" fontWeight="600">
            Demo Setup (Pre-Flight Checklist)
          </Text>
        </Flex>
        {allPreflightOk ? (
          <Badge colorScheme="green" fontSize="sm" px="3" py="1">
            ✓ System ready for demo
          </Badge>
        ) : (
          <Badge colorScheme="orange" fontSize="sm" px="3" py="1">
            Fix items below before starting
          </Badge>
        )}
      </Box>
      <Box px="20px" py="16px">
        <Flex direction="column" gap="6">
          {/* Pre-Flight Checklist */}
          <Box>
            <Text color={textColor} fontWeight="600" fontSize="sm" mb="2">
              Pre-Flight Checklist
            </Text>
            <StatusRow label="Dashboard" ok={true} />
            <StatusRow label="Python Backend" ok={pythonOk} loading={pythonOk === null} />
            <StatusRow label="Camera Stream" ok={pythonOk} />
            <StatusRow
              label="At least one enrolled face"
              ok={enrolledCount !== null ? enrolledCount > 0 : null}
              loading={enrolledCount === null}
            />
            {enrolledCount === 0 && (
              <Text fontSize="xs" color={warnColor} mt="1" display="flex" alignItems="center" gap="1">
                <Icon as={MdWarning} boxSize="4" /> Add faces to known_faces/ and run enroll_face.py
              </Text>
            )}
            {pythonOk === false && (
              <Text fontSize="xs" color="gray.500" mt="2">
                Start the Python attendance engine: scripts\start-attendance.bat
              </Text>
            )}
          </Box>

          {/* Step 2: WhatsApp (Client must join sandbox) */}
          <Box>
            <Text color={textColor} fontWeight="600" fontSize="sm" mb="2">
              Step 2: WhatsApp – Client Joined Sandbox
            </Text>
            <StatusRow
              label="WhatsApp OK (test send)"
              ok={whatsappOk}
              loading={testing}
            />
            {whatsappOk === false && (
              <Text fontSize="xs" color={warnColor} mt="1" display="flex" flexDirection="column" gap="1">
                <span>Ask client to send <strong>join {SANDBOX_JOIN_PHRASE}</strong> to <strong>{SANDBOX_NUMBER}</strong></span>
              </Text>
            )}
            <Text fontSize="xs" color="gray.500" mb="2" mt="2">
              To receive attendance alerts, send <strong>join {SANDBOX_JOIN_PHRASE}</strong> to{' '}
              <strong>{SANDBOX_NUMBER}</strong> from your WhatsApp.
            </Text>
            <Box mt="2">
              <Text fontSize="xs" color="gray.500" mb="1">
                Or scan this QR code (opens WhatsApp with the join message pre-filled):
              </Text>
              <Image
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  SANDBOX_JOIN_LINK,
                )}`}
                alt={`WhatsApp join QR (join ${SANDBOX_JOIN_PHRASE})`}
                boxSize="180px"
                borderRadius="md"
                borderWidth="1px"
                borderColor={borderColor}
                bg="white"
              />
            </Box>
            <Link
              href="https://console.twilio.com/us1/develop/sms/try-it-out/whatsapp-learn"
              isExternal
              fontSize="xs"
              color="blue.500"
            >
              Get join phrase from Twilio Console →
            </Link>
            <Flex gap="2" mt="3" align="center" flexWrap="wrap">
              <Input
                placeholder="Recipient phone (e.g. 919876543210)"
                size="sm"
                maxW="220px"
                value={testPhone}
                onChange={(e) => setTestPhone(e.target.value)}
              />
              <Button
                size="sm"
                colorScheme="green"
                leftIcon={testing ? <Spinner size="sm" /> : <Icon as={MdSend} />}
                onClick={onTestSend}
                isLoading={testing}
              >
                Test WhatsApp
              </Button>
            </Flex>
          </Box>

          {/* Step 3: Live Event Log + Quick Reset */}
          <Box>
            <Text color={textColor} fontWeight="600" fontSize="sm" mb="2">
              Step 3: Live Event Log
            </Text>
            <Text fontSize="xs" color="gray.500" mb="2">
              Faces detected and messages dispatched appear in the Notifications table below.
            </Text>
            <Button
              size="sm"
              variant="outline"
              colorScheme="blue"
              onClick={async () => {
                try {
                  const res = await fetch('/api/reset-cooldowns', { method: 'POST' });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    toast({ title: 'Cooldowns reset', description: 'Same person can be recognized again', status: 'success', isClosable: true });
                  } else {
                    toast({ title: 'Reset failed', description: data?.error || 'Python server not running', status: 'warning', isClosable: true });
                  }
                } catch (e) {
                  toast({ title: 'Reset failed', description: e instanceof Error ? e.message : 'Network error', status: 'error', isClosable: true });
                }
              }}
            >
              Reset Cooldowns
            </Button>
            <Text fontSize="xs" color="gray.500" mt="1">
              Use between demos so the same face can be recognized again immediately.
            </Text>
          </Box>
        </Flex>
      </Box>
    </Card>
  );
}
