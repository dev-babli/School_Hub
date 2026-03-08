'use client';

import {
  Box,
  Button,
  Card,
  Flex,
  SimpleGrid,
  Spinner,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import LiveFeedCard from 'components/camera/LiveFeedCard';
import FaceScanAnalysis from 'components/camera/FaceScanAnalysis';
import EnrolledFacesCard from 'components/camera/EnrolledFacesCard';
import EnrollmentInfoCard from 'components/camera/EnrollmentInfoCard';
import EnrollFaceCard from 'components/camera/EnrollFaceCard';
import { useCampus } from 'contexts/CampusContext';
import { apiHeaders } from 'lib/apiClient';
import { useCallback, useState } from 'react';

const DEMO_NAMES = [
  'Rahul Sharma',
  'Priya Patel',
  'Amit Kumar',
  'Sneha Reddy',
  'Vikram Singh',
  'Anita Desai',
  'Rajesh Nair',
  'Kavita Iyer',
  'Suresh Menon',
  'Deepa Krishnan',
];

function studentPayload(
  tenantId: string,
  studentName: string
): { student_name: string; phone: string; time: string } {
  const phone =
    process.env.NEXT_PUBLIC_DEMO_PHONE || '971582553710';
  const now = new Date();
  const time = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return { student_name: studentName, phone, time };
}

export default function FacePage() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const { tenantId } = useCampus();
  const toast = useToast();
  const [simulating, setSimulating] = useState(false);
  const { isOpen: isFaceScanOpen, onOpen: onFaceScanOpen, onClose: onFaceScanClose } = useDisclosure();

  const onFaceScanSuccess = useCallback(
    async (_analysis: { confidence: number; yaw: number; pitch: number; roll: number }) => {
      onFaceScanClose();
      const name = DEMO_NAMES[Math.floor(Math.random() * DEMO_NAMES.length)];
      setSimulating(true);
      const { student_name, phone, time } = studentPayload(tenantId, name);
      try {
        const res = await fetch('/api/attendance-event', {
          method: 'POST',
          headers: apiHeaders(),
          body: JSON.stringify({ student_name, phone, time, tenant_id: tenantId }),
        });
        const data = await res.json();
        if (!res.ok) {
          toast({ title: data?.error ?? 'Request failed', status: 'error', isClosable: true });
          return;
        }
        toast({
          title:
            data.status === 'sent'
              ? 'Face scan complete — Attendance & WhatsApp sent'
              : 'Send failed (see table)',
          status: data.status === 'sent' ? 'success' : 'warning',
          isClosable: true,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Network error';
        toast({
          title: 'Network error',
          description: msg,
          status: 'error',
          isClosable: true,
          duration: 8000,
        });
      } finally {
        setSimulating(false);
      }
    },
    [tenantId, toast, onFaceScanClose]
  );

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {isFaceScanOpen && (
        <FaceScanAnalysis
          isOpen
          onClose={onFaceScanClose}
          onScanSuccess={onFaceScanSuccess}
        />
      )}

      <Text color={textColor} fontSize="2xl" fontWeight="700" mb="24px">
        Face Recognition
      </Text>
      <Text fontSize="sm" color="gray.500" mb="20px">
        Manage enrolled faces, run face scan, view live feed, and add new faces.
      </Text>

      {/* Face Scan Analysis card */}
      <Card p="6" mb="20px">
        <Flex alignItems="center" justifyContent="space-between" flexWrap="wrap" gap="4">
          <Box>
            <Text color={textColor} fontSize="lg" fontWeight="700" mb="1">
              Face Scan Analysis
            </Text>
            <Text fontSize="sm" color="gray.500">
              Detailed face scan with pose guidance — turn left, right, look up/down.
              Captures yaw, pitch, roll & quality.
            </Text>
          </Box>
          <Button
            colorScheme="brand"
            size="lg"
            leftIcon={simulating ? <Spinner size="sm" aria-hidden /> : undefined}
            onClick={onFaceScanOpen}
            isDisabled={simulating}
            aria-label={simulating ? 'Processing face scan' : 'Start face scan analysis with pose guidance'}
          >
            {simulating ? 'Processing…' : 'Start Face Scan'}
          </Button>
        </Flex>
      </Card>

      {/* Live camera feed */}
      <Box mb="20px">
        <LiveFeedCard />
      </Box>

      {/* Face tracking: Enrolled faces + Enrollment info + Enroll script helper */}
      <SimpleGrid columns={{ base: 1, lg: 3 }} gap="20px" mb="20px">
        <EnrolledFacesCard />
        <EnrollmentInfoCard />
        <EnrollFaceCard />
      </SimpleGrid>
    </Box>
  );
}
