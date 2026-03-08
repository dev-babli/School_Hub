'use client';

import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Progress,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { Fingerprint, ScanFace } from 'lucide-react';

type ScanMode = 'fingerprint' | 'face';

interface BiometricSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (studentName: string) => void;
  campusLabel: string;
}

export default function BiometricSimulator({
  isOpen,
  onClose,
  onScanSuccess,
  campusLabel,
}: BiometricSimulatorProps) {
  const [mode, setMode] = useState<ScanMode>('fingerprint');
  const [phase, setPhase] = useState<'idle' | 'scanning' | 'matched' | 'done'>('idle');
  const [matchedName, setMatchedName] = useState('');
  const [progress, setProgress] = useState(0);
  const sentRef = useRef(false);
  const onScanSuccessRef = useRef(onScanSuccess);
  const onCloseRef = useRef(onClose);
  onScanSuccessRef.current = onScanSuccess;
  onCloseRef.current = onClose;

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPhase('idle');
      setMatchedName('');
      setProgress(0);
      sentRef.current = false;
    }
  }, [isOpen]);

  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.300');
  const scanBg = useColorModeValue('gray.50', 'whiteAlpha.50');

  const DEMO_NAMES = [
    'Rahul Sharma',
    'Priya Patel',
    'Amit Kumar',
    'Sneha Reddy',
    'Vikram Singh',
    'Anita Desai',
    'Rajesh Nair',
    'Kavita Iyer',
  ];

  const handleStartScan = () => {
    setPhase('scanning');
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(interval);
          const name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
          setMatchedName(name);
          setPhase('matched');
          return 100;
        }
        return p + 8;
      });
    }, 120);
  };

  // Auto-send once scan verifies (use refs so parent re-renders don't cancel the timeout)
  useEffect(() => {
    if (phase === 'matched' && matchedName && !sentRef.current) {
      sentRef.current = true;
      const name = matchedName;
      const t = setTimeout(() => {
        onScanSuccessRef.current(name);
        onCloseRef.current();
        setPhase('idle');
        setMatchedName('');
        setProgress(0);
        sentRef.current = false;
      }, 800);
      return () => clearTimeout(t);
    }
  }, [phase, matchedName]);

  const handleClose = () => {
    sentRef.current = false;
    setPhase('idle');
    setMatchedName('');
    setProgress(0);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="md"
      isCentered
      blockScrollOnMount
      trapFocus={false}
      closeOnOverlayClick
      motionPreset="none"
    >
      <ModalOverlay bg="blackAlpha.600" />
      <ModalContent>
        <ModalHeader>
          <Text fontSize="lg" fontWeight="700">
            Biometric Attendance Device (Simulated)
          </Text>
          <Text fontSize="sm" fontWeight="400" color="gray.500" mt="1">
            {campusLabel} · ZKTeco-style scanner
          </Text>
        </ModalHeader>
        <ModalBody>
          {/* Mode selector */}
          {phase === 'idle' && (
            <Flex gap="3" mb="6">
              <Button
                flex={1}
                variant={mode === 'fingerprint' ? 'solid' : 'outline'}
                colorScheme="brand"
                leftIcon={<Fingerprint size={20} />}
                onClick={() => setMode('fingerprint')}
              >
                Fingerprint
              </Button>
              <Button
                flex={1}
                variant={mode === 'face' ? 'solid' : 'outline'}
                colorScheme="brand"
                leftIcon={<ScanFace size={20} />}
                onClick={() => setMode('face')}
              >
                Face
              </Button>
            </Flex>
          )}

          {/* Scanner area */}
          <Box
            p="8"
            borderRadius="xl"
            border="2px dashed"
            borderColor={phase === 'scanning' ? 'brand.400' : borderColor}
            bg={scanBg}
            textAlign="center"
            transition="all 0.3s"
          >
            {phase === 'idle' && (
              <>
                <Box mb="4">
                  {mode === 'fingerprint' ? (
                    <Fingerprint size={80} strokeWidth={1.5} color="var(--chakra-colors-brand-500)" />
                  ) : (
                    <ScanFace size={80} strokeWidth={1.5} color="var(--chakra-colors-brand-500)" />
                  )}
                </Box>
                <Text fontSize="md" fontWeight="600" mb="2">
                  {mode === 'fingerprint'
                    ? 'Place finger on scanner'
                    : 'Position face in frame'}
                </Text>
                <Text fontSize="sm" color="gray.500" mb="4">
                  Click below to simulate biometric scan
                </Text>
                <Button colorScheme="brand" size="lg" onClick={handleStartScan}>
                  {mode === 'fingerprint' ? 'Scan Fingerprint' : 'Scan Face'}
                </Button>
              </>
            )}

            {phase === 'scanning' && (
              <>
                <Box mb="4">
                  {mode === 'fingerprint' ? (
                    <Fingerprint size={80} strokeWidth={2} color="var(--chakra-colors-brand-500)" />
                  ) : (
                    <ScanFace size={80} strokeWidth={2} color="var(--chakra-colors-brand-500)" />
                  )}
                </Box>
                <Text fontSize="md" fontWeight="600" mb="3">
                  Scanning...
                </Text>
                <Progress value={progress} size="sm" colorScheme="brand" borderRadius="full" />
              </>
            )}

            {phase === 'matched' && (
              <>
                <Box mb="4" color="green.500">
                  {mode === 'fingerprint' ? (
                    <Fingerprint size={80} strokeWidth={2} />
                  ) : (
                    <ScanFace size={80} strokeWidth={2} />
                  )}
                </Box>
                <Text fontSize="md" fontWeight="700" color="green.600" mb="1">
                  ✓ Match found
                </Text>
                <Text fontSize="lg" fontWeight="700" mb="2">
                  {matchedName}
                </Text>
                <Text fontSize="sm" color="gray.500">
                  Sending WhatsApp to parent...
                </Text>
              </>
            )}
          </Box>
        </ModalBody>
        <ModalFooter>
          {phase === 'idle' && (
            <Button variant="ghost" onClick={handleClose}>
              Close
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
