'use client';

import {
  Box,
  Button,
  Flex,
  Grid,
  Image,
  Input,
  Select,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useColorModeValue,
  useDisclosure,
  useToast,
} from '@chakra-ui/react';
import Card from 'components/card/Card';
import { apiHeaders } from 'lib/apiClient';
import { useCallback, useEffect, useState } from 'react';

type UnknownFace = {
  id: string;
  image_base64: string;
  camera_id: string;
  timestamp: number;
  status: string;
  assigned_student_name?: string;
};

type Student = { id: string; name: string; phone: string; tenant_id: string };

export default function UnknownFacesPage() {
  const [faces, setFaces] = useState<UnknownFace[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState(() => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
  });
  const [selectedFace, setSelectedFace] = useState<UnknownFace | null>(null);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const fetchFaces = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (dateFilter) params.set('date', dateFilter);
      params.set('status', 'pending_review');
      const res = await fetch(`/api/unknown-faces?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFaces(data.faces ?? []);
      }
    } catch {
      setFaces([]);
    } finally {
      setLoading(false);
    }
  }, [dateFilter]);

  const fetchStudents = useCallback(async () => {
    try {
      const res = await fetch('/api/students');
      if (res.ok) {
        const data = await res.json();
        setStudents(data.students ?? []);
      }
    } catch {
      setStudents([]);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchFaces();
  }, [fetchFaces]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const handleOpenAssign = (face: UnknownFace) => {
    setSelectedFace(face);
    setAssignStudentId('');
    onOpen();
  };

  const handleAssign = async () => {
    if (!selectedFace || !assignStudentId) return;
    setAssigning(true);
    try {
      const res = await fetch(`/api/unknown-faces/${selectedFace.id}/assign`, {
        method: 'POST',
        headers: apiHeaders(),
        body: JSON.stringify({ student_id: assignStudentId }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: `Assigned to ${data.assigned_to}. WhatsApp ${data.whatsapp_status}.`, status: 'success', isClosable: true });
        onClose();
        setSelectedFace(null);
        fetchFaces();
      } else {
        toast({ title: data.error ?? 'Assign failed', status: 'error', isClosable: true });
      }
    } catch (e) {
      toast({ title: 'Request failed', status: 'error', isClosable: true });
    } finally {
      setAssigning(false);
    }
  };

  const textColor = useColorModeValue('secondaryGray.900', 'white');

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <Card mb="20px" p="6">
        <Text color={textColor} fontSize="xl" fontWeight="700" mb="4">
          Unknown Faces — Manual Assignment
        </Text>
        <Text color="gray.500" fontSize="sm" mb="4">
          Review faces that could not be auto-matched. Assign to a student to log attendance and send WhatsApp.
        </Text>
        <Flex gap="4" align="center" flexWrap="wrap">
          <Box>
            <Text fontSize="sm" color="gray.500" mb="1">Date</Text>
            <Input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              maxW="180px"
            />
          </Box>
          <Button mt="6" onClick={() => { setLoading(true); fetchFaces(); }} size="sm">
            Refresh
          </Button>
          <Button
            mt="6"
            size="sm"
            variant="outline"
            onClick={async () => {
              const placeholderBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='; // 1x1 gray PNG
              try {
                await fetch('/api/unknown-faces', {
                  method: 'POST',
                  headers: apiHeaders(),
                  body: JSON.stringify({ image_base64: placeholderBase64, camera_id: 'demo' }),
                });
                fetchFaces();
                toast({ title: 'Test face added', status: 'info', isClosable: true });
              } catch {
                toast({ title: 'Failed to add test', status: 'error', isClosable: true });
              }
            }}
          >
            Add test face
          </Button>
        </Flex>
      </Card>

      {loading ? (
        <Text color={textColor}>Loading...</Text>
      ) : faces.length === 0 ? (
        <Card p="8">
          <Text color="gray.500">No pending unknown faces. Add faces via the Face Recognition PoC or API.</Text>
        </Card>
      ) : (
        <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(6, 1fr)' }} gap="4">
          {faces.map((face) => (
            <Card key={face.id} p="2" cursor="pointer" onClick={() => handleOpenAssign(face)} _hover={{ shadow: 'md' }}>
              <Image
                src={`data:image/${face.image_base64.startsWith('/9j/') ? 'jpeg' : 'png'};base64,${face.image_base64}`}
                alt="Unknown face"
                borderRadius="md"
                objectFit="cover"
                h="120px"
                w="100%"
              />
              <Text fontSize="xs" color="gray.500" mt="2" noOfLines={1}>
                {new Date(face.timestamp).toLocaleTimeString()} · {face.camera_id}
              </Text>
            </Card>
          ))}
        </Grid>
      )}

      <Modal isOpen={isOpen} onClose={onClose} size="md" isCentered>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Assign to Student</ModalHeader>
          <ModalBody>
            {selectedFace && (
              <>
                <Flex gap="4" mb="4">
                  <Image
                    src={`data:image/${selectedFace.image_base64.startsWith('/9j/') ? 'jpeg' : 'png'};base64,${selectedFace.image_base64}`}
                    alt="Face"
                    maxW="120px"
                    borderRadius="md"
                  />
                  <Box>
                    <Text fontSize="sm" color="gray.500">
                      {new Date(selectedFace.timestamp).toLocaleString()} · {selectedFace.camera_id}
                    </Text>
                  </Box>
                </Flex>
                <Text fontSize="sm" mb="2">Select student:</Text>
                <Select
                  value={assignStudentId}
                  onChange={(e) => setAssignStudentId(e.target.value)}
                  placeholder="Choose student"
                >
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (ID: {s.id})</option>
                  ))}
                </Select>
              </>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr="3" onClick={onClose}>Cancel</Button>
            <Button
              colorScheme="brand"
              onClick={handleAssign}
              isDisabled={!assignStudentId}
              isLoading={assigning}
            >
              Assign & Send WhatsApp
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
