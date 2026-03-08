'use client';

import {
  Box,
  Button,
  Flex,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Spinner,
  Avatar,
  useToast,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import { MdFace, MdDeleteSweep } from 'react-icons/md';
import { Icon } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { apiHeaders } from 'lib/apiClient';

type EnrolledStudent = {
  name: string;
  student_id: string;
  phone: string;
  tenant_id: string;
  photo: string | null;
  hasPhoto: boolean;
};

export default function EnrolledFacesCard() {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.200');
  const [students, setStudents] = useState<EnrolledStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const toast = useToast();

  const fetchStudents = useCallback(() => {
    setLoading(true);
    fetch('/api/enrolled-faces')
      .then((r) => r.json())
      .then((data: { students?: EnrolledStudent[] }) => setStudents(data?.students ?? []))
      .catch(() => setStudents([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleClearAll = useCallback(async () => {
    if (!confirm('Clear all enrolled faces? Use this when switching to a new client. Then enroll a new face.')) return;
    setClearing(true);
    try {
      const res = await fetch('/api/clear-enrolled-faces', {
        method: 'POST',
        headers: apiHeaders(),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: data?.error ?? 'Failed to clear', status: 'error', isClosable: true });
        return;
      }
      toast({ title: 'Cleared. Enroll a new face for the next client.', status: 'success', isClosable: true });
      fetchStudents();
    } catch {
      toast({ title: 'Failed to clear', status: 'error', isClosable: true });
    } finally {
      setClearing(false);
    }
  }, [fetchStudents, toast]);

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
        justifyContent="space-between"
        gap="2"
      >
        <Flex align="center" gap="2">
          <Icon as={MdFace} w="20px" h="20px" color="brand.500" />
          <Text color={textColor} fontSize="md" fontWeight="600">
            Enrolled Faces
          </Text>
        </Flex>
        {students.length > 0 && (
          <Button
            size="xs"
            colorScheme="red"
            variant="outline"
            leftIcon={<Icon as={MdDeleteSweep} />}
            onClick={handleClearAll}
            isLoading={clearing}
            aria-label="Clear all (for new client)"
          >
            Clear all
          </Button>
        )}
      </Box>
      <Box w="100%" overflowX="auto">
        {loading ? (
          <Flex justify="center" py="8">
            <Spinner size="lg" />
          </Flex>
        ) : students.length === 0 ? (
          <Text py="6" px="4" color="gray.500" fontSize="sm" textAlign="center">
            No enrolled faces. Click Enroll Face below, add a name, then run attendance.
          </Text>
        ) : (
          <Table variant="simple" size="sm">
            <Thead>
              <Tr>
                <Th borderColor={borderColor} color="gray.500">Photo</Th>
                <Th borderColor={borderColor} color="gray.500">Name</Th>
                <Th borderColor={borderColor} color="gray.500">ID</Th>
                <Th borderColor={borderColor} color="gray.500">Phone</Th>
                <Th borderColor={borderColor} color="gray.500">Tenant</Th>
                <Th borderColor={borderColor} color="gray.500">Match Status</Th>
              </Tr>
            </Thead>
            <Tbody>
              {students.map((s) => (
                <Tr key={s.student_id + s.name} bgColor={!s.hasPhoto ? 'red.50' : undefined}>
                  <Td borderColor={borderColor}>
                    {s.hasPhoto ? (
                      <Avatar
                        size="sm"
                        src={`/api/face-photo?name=${encodeURIComponent(s.name)}`}
                        name={s.name}
                        bg="gray.200"
                      />
                    ) : (
                      <Avatar size="sm" name={s.name} bg="gray.400" />
                    )}
                  </Td>
                  <Td borderColor={borderColor} fontWeight="600" color={textColor}>
                    {s.name}
                  </Td>
                  <Td borderColor={borderColor} color={textColor}>
                    {s.student_id}
                  </Td>
                  <Td borderColor={borderColor} color={textColor} fontSize="xs">
                    {s.phone}
                  </Td>
                  <Td borderColor={borderColor} color={textColor}>
                    {s.tenant_id}
                  </Td>
                  <Td borderColor={borderColor} color={s.hasPhoto ? 'green.600' : 'red.500'} fontSize="xs">
                    {s.hasPhoto ? 'CSV ✓ Photo ✓' : 'CSV ✓ Photo ✗ (add to known_faces)'}
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </Box>
    </Card>
  );
}
