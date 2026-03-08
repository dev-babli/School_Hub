'use client';

import React, { useCallback, useEffect, useState } from 'react';
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
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { ScanFace } from 'lucide-react';

export interface FaceAnalysisData {
  name?: string;
  confidence: number;
  yaw?: number;
  pitch?: number;
  roll?: number;
  faceSize?: number;
  quality?: number;
}

interface FaceScanAnalysisProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (analysis: FaceAnalysisData) => void;
}

export default function FaceScanAnalysis({
  isOpen,
  onClose,
  onScanSuccess,
}: FaceScanAnalysisProps) {
  const [step, setStep] = useState<'idle' | 'camera' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [streamAvailable, setStreamAvailable] = useState<boolean | null>(null);

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const successColor = useColorModeValue('green.500', 'green.400');
  const successBg = useColorModeValue('green.50', 'whiteAlpha.100');

  useEffect(() => {
    if (!isOpen) {
      setStep('idle');
      setError(null);
      setStreamAvailable(null);
    }
  }, [isOpen]);

  const startScan = useCallback(async () => {
    setError(null);
    setStreamAvailable(null);
    try {
      const res = await fetch('/api/camera-stream?check=1');
      const data = (await res.json()) as { available?: boolean };
      if (data?.available !== true) {
        setError('Attendance camera not available. Run the livestream server first: py livestream_server.py from face-recognition-poc folder.');
        setStep('error');
        return;
      }
      setStreamAvailable(true);
      setStep('camera');
    } catch {
      setError('Could not reach camera stream. Start livestream_server.py from face-recognition-poc.');
      setStep('error');
    }
  }, []);

  const [recognizing, setRecognizing] = useState(false);
  const [recognitionResult, setRecognitionResult] = useState<{
    name: string | null;
    confidence: number;
  } | null>(null);

  const completeScan = useCallback(async () => {
    setRecognizing(true);
    setRecognitionResult(null);
    try {
      const res = await fetch('/api/recognize-face');
      const data = (await res.json()) as {
        name?: string | null;
        confidence?: number;
        error?: string;
      };
      const name = data?.name ?? null;
      const confidence = typeof data?.confidence === 'number' ? data.confidence : 0;
      setRecognitionResult({ name, confidence });
      setStep('success');
      if (name && confidence >= 0.5) {
        onScanSuccess({ name, confidence });
      } else {
        onScanSuccess({ confidence });
      }
    } catch {
      setRecognitionResult({ name: null, confidence: 0 });
      setStep('success');
      onScanSuccess({ confidence: 0 });
    } finally {
      setRecognizing(false);
    }
  }, [onScanSuccess]);

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      size="2xl"
      isCentered
      blockScrollOnMount
      closeOnOverlayClick={false}
    >
      <ModalOverlay bg="blackAlpha.700" />
      <ModalContent maxW="680px">
        <ModalHeader>
          <Flex align="center" gap="2">
            <ScanFace size={24} />
            <Text>Face Scan</Text>
          </Flex>
          <Text fontSize="sm" fontWeight="400" color="gray.500" mt="1">
            Same camera as Live Feed and attendance. Position your face, then complete scan.
          </Text>
        </ModalHeader>
        <ModalBody>
          {step === 'idle' && (
            <Flex flexDirection="column" alignItems="center" py="12" gap="4">
              <ScanFace size={80} strokeWidth={1.5} color="var(--chakra-colors-brand-500)" />
              <Text fontWeight="600">Face scan for attendance</Text>
              <Text fontSize="sm" color="gray.500" textAlign="center" maxW="400px">
                Uses the same camera as attendance tracking. Start the attendance script if needed, then click Start scan.
              </Text>
              <Button colorScheme="brand" size="lg" onClick={startScan}>
                Start scan
              </Button>
            </Flex>
          )}

          {step === 'error' && (
            <Flex flexDirection="column" alignItems="center" py="12" gap="4">
              <Text color="red.500" fontWeight="600">
                {error}
              </Text>
              <Button colorScheme="brand" onClick={startScan}>
                Try again
              </Button>
            </Flex>
          )}

          {(step === 'camera' || step === 'success') && (
            <Box>
              {step === 'camera' && streamAvailable && (
                <Box
                  position="relative"
                  borderRadius="lg"
                  overflow="hidden"
                  bg="black"
                  aspectRatio={4 / 3}
                  maxH="360px"
                >
                  <img
                    src="/api/camera-stream"
                    alt="Attendance camera feed"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <Box
                    position="absolute"
                    bottom="0"
                    left="0"
                    right="0"
                    bg="blackAlpha.70"
                    color="white"
                    px="4"
                    py="3"
                    textAlign="center"
                  >
                    <Text fontWeight="600" fontSize="lg" mb="2">
                      Position your face in the frame
                    </Text>
                    <Button
                      colorScheme="green"
                      size="md"
                      onClick={completeScan}
                      isLoading={recognizing}
                      loadingText="Recognizing..."
                    >
                      Complete scan
                    </Button>
                  </Box>
                </Box>
              )}

              {step === 'success' && (
                <Flex
                  p="6"
                  borderRadius="lg"
                  bg={successBg}
                  border="1px solid"
                  borderColor={successColor}
                  flexDirection="column"
                  gap="2"
                >
                  <Text fontWeight="700" color={successColor}>
                    Scan complete
                  </Text>
                  {recognitionResult?.name ? (
                    <Text fontSize="sm" color={textColor}>
                      Recognized: <strong>{recognitionResult.name}</strong> (
                      {(recognitionResult.confidence * 100).toFixed(0)}%) — Attendance
                      registered and WhatsApp sent.
                    </Text>
                  ) : recognitionResult ? (
                    <Text fontSize="sm" color="gray.600">
                      No face recognized (or confidence too low). If you expected a match,
                      ensure the face is enrolled and well lit.
                    </Text>
                  ) : (
                    <Text fontSize="sm" color={textColor}>
                      Attendance will be registered and WhatsApp sent.
                    </Text>
                  )}
                </Flex>
              )}
            </Box>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
