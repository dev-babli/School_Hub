'use client';

import { Box, Text, useColorModeValue } from '@chakra-ui/react';
import { useEffect, useState } from 'react';
import Card from 'components/card/Card';
import { MdVideocam, MdVideocamOff } from 'react-icons/md';
import { Icon } from '@chakra-ui/react';

export default function LiveFeedCard() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const [streamAvailable, setStreamAvailable] = useState<boolean | null>(null);
  const [streamError, setStreamError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  // Auto-retry when stream drops
  useEffect(() => {
    if (!streamError) return;
    const t = setTimeout(() => {
      setStreamError(false);
      setRetryKey((k) => k + 1);
    }, 5000);
    return () => clearTimeout(t);
  }, [streamError]);

  useEffect(() => {
    let cancelled = false;

    const check = () => {
      fetch('/api/camera-stream?check=1')
        .then((r) => r.json())
        .then((data: { available?: boolean }) => {
          if (!cancelled) setStreamAvailable(data?.available === true);
        })
        .catch(() => {
          if (!cancelled) setStreamAvailable(false);
        });
    };

    check();
    const interval = setInterval(check, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const showStream = streamAvailable === true && !streamError;

  return (
    <Card p="0" alignItems="center" flexDirection="column" w="100%" overflow="hidden">
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
        <Icon as={MdVideocam} w="20px" h="20px" color="green.500" />
        <Text color={textColor} fontSize="md" fontWeight="600">
          Live Camera Feed
        </Text>
      </Box>
      <Box w="100%" position="relative" minH="320px" bg="black" display="flex" justifyContent="center">
        {streamAvailable === null ? (
          <Box
            w="100%"
            minH="240px"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap="2"
            bg="gray.800"
            color="gray.500"
            p="6"
          >
            <Text fontSize="sm">Checking stream...</Text>
          </Box>
        ) : !showStream ? (
          <Box
            w="100%"
            minH="240px"
            display="flex"
            flexDirection="column"
            alignItems="center"
            justifyContent="center"
            gap="3"
            bg="gray.800"
            color="gray.400"
            p="6"
          >
            <Icon as={MdVideocamOff} w="48px" h="48px" />
            <Text fontSize="sm" textAlign="center">
              Stream offline
            </Text>
            <Text fontSize="xs" textAlign="center" maxW="280px">
              {streamError ? 'Stream disconnected. Reconnecting...' : 'Run: '}
              {!streamError && <code style={{ color: '#68d391' }}>py attendance_poc.py</code>}
              {!streamError && ' — green box + name + WhatsApp'}
            </Text>
          </Box>
        ) : (
          <img
            key={retryKey}
            src={`/api/camera-stream?t=${retryKey}`}
            alt="Live camera feed"
            style={{
              width: '100%',
              height: 'auto',
              minHeight: '320px',
              objectFit: 'contain',
              display: 'block',
            }}
            onError={() => setStreamError(true)}
          />
        )}
      </Box>
    </Card>
  );
}
