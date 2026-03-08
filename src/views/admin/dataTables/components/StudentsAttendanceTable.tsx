'use client';

import * as React from 'react';
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
  useDisclosure,
  Badge,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  FormControl,
  FormLabel,
  Input,
  SimpleGrid,
  useToast,
} from '@chakra-ui/react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';
import Card from 'components/card/Card';
import { Icon } from '@chakra-ui/react';
import { MdAdd, MdEdit } from 'react-icons/md';
import type { StudentAttendanceRow } from 'views/admin/dataTables/variables/studentsAttendanceData';

const columnHelper = createColumnHelper<StudentAttendanceRow>();

type AddStudentForm = {
  studentName: string;
  rollNo: string;
  class: string;
  section: string;
  parent1Name: string;
  parent1Phone: string;
  parent2Name: string;
  parent2Phone: string;
};

const emptyForm: AddStudentForm = {
  studentName: '',
  rollNo: '',
  class: '',
  section: '',
  parent1Name: '',
  parent1Phone: '',
  parent2Name: '',
  parent2Phone: '',
};

export default function StudentsAttendanceTable(props: { tableData: StudentAttendanceRow[] }) {
  const { tableData } = props;
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [data, setData] = React.useState(() => [...tableData]);
  const [form, setForm] = React.useState<AddStudentForm>(emptyForm);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');

  const columns = [
    columnHelper.accessor('studentName', {
      id: 'studentName',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          STUDENT NAME
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('rollNo', {
      id: 'rollNo',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          ROLL NO
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="600">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('class', {
      id: 'class',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          CLASS
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="600">
          {info.getValue()}-{info.row.original.section}
        </Text>
      ),
    }),
    columnHelper.accessor('attendanceRegistries', {
      id: 'attendanceRegistries',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          ATTENDANCE REGISTRIES
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('parentsLinked', {
      id: 'parentsLinked',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          PARENTS LINKED
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="700">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('lastAttendanceDate', {
      id: 'lastAttendanceDate',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          LAST MARKED
        </Text>
      ),
      cell: (info) => (
        <Text color={textColor} fontSize="sm" fontWeight="600">
          {info.getValue()}
        </Text>
      ),
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          STATUS
        </Text>
      ),
      cell: (info) => (
        <Badge
          colorScheme={info.getValue() === 'active' ? 'green' : 'gray'}
          fontSize="xs"
        >
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: () => (
        <Text fontSize={{ sm: '10px', lg: '12px' }} color="gray.400">
          ACTIONS
        </Text>
      ),
      cell: (info) => (
        <Button
          size="xs"
          variant="ghost"
          leftIcon={<Icon as={MdEdit} />}
          onClick={() => {
            const row = info.row.original;
            setEditingId(row.id);
            setForm({
              studentName: row.studentName,
              rollNo: row.rollNo,
              class: row.class,
              section: row.section,
              parent1Name: '',
              parent1Phone: '',
              parent2Name: '',
              parent2Phone: '',
            });
            onOpen();
          }}
        >
          View / Edit
        </Button>
      ),
    }),
  ];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const handleSaveStudent = () => {
    if (!form.studentName.trim() || !form.rollNo.trim() || !form.class.trim()) {
      toast({
        title: 'Required fields',
        description: 'Please fill Student Name, Roll No, and Class.',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    const parentsLinked = [form.parent1Phone, form.parent2Phone].filter(Boolean).length;
    if (editingId) {
      setData((prev) =>
        prev.map((row) =>
          row.id === editingId
            ? {
                ...row,
                studentName: form.studentName,
                rollNo: form.rollNo,
                class: form.class,
                section: form.section || 'A',
                parentsLinked,
              }
            : row
        )
      );
      setEditingId(null);
      toast({
        title: 'Student updated',
        description: `${form.studentName} has been updated.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    } else {
      const newRow: StudentAttendanceRow = {
        id: String(Date.now()),
        studentName: form.studentName,
        rollNo: form.rollNo,
        class: form.class,
        section: form.section || 'A',
        attendanceRegistries: 0,
        parentsLinked,
        lastAttendanceDate: '—',
        status: 'active',
      };
      setData((prev) => [newRow, ...prev]);
      toast({
        title: 'Student added',
        description: `${form.studentName} has been added.`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
    setForm(emptyForm);
    onClose();
  };

  const openAddModal = () => {
    setEditingId(null);
    setForm(emptyForm);
    onOpen();
  };

  return (
    <>
      <Card flexDirection="column" w="100%" px="0px" overflowX={{ sm: 'scroll', lg: 'hidden' }}>
        <Flex px="25px" mb="8px" justifyContent="space-between" align="center">
          <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%">
            Students & Attendance Registries
          </Text>
          <Button
            leftIcon={<Icon as={MdAdd} />}
            colorScheme="brand"
            size="sm"
            onClick={openAddModal}
          >
            Add new student
          </Button>
        </Flex>
        <Box>
          <Table variant="simple" color="gray.500" mb="24px" mt="12px">
            <Thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <Tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <Th
                      key={header.id}
                      pe="10px"
                      borderColor={borderColor}
                      cursor="pointer"
                      onClick={header.column.getToggleSortingHandler?.()}
                      fontSize={{ sm: '10px', lg: '12px' }}
                      color="gray.400"
                    >
                      <Flex justifyContent="space-between" align="center">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </Flex>
                    </Th>
                  ))}
                </Tr>
              ))}
            </Thead>
            <Tbody>
              {table.getRowModel().rows.map((row) => (
                <Tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <Td
                      key={cell.id}
                      fontSize={{ sm: '14px' }}
                      minW={{ sm: '120px', md: 'auto' }}
                      borderColor="transparent"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </Td>
                  ))}
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Card>

      <Modal
        isOpen={isOpen}
        onClose={() => {
          setEditingId(null);
          setForm(emptyForm);
          onClose();
        }}
        size="xl"
      >
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>{editingId ? 'View / Edit student' : 'Add new student'}</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
              <FormControl isRequired>
                <FormLabel>Student name</FormLabel>
                <Input
                  value={form.studentName}
                  onChange={(e) => setForm((f) => ({ ...f, studentName: e.target.value }))}
                  placeholder="Full name"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Roll number</FormLabel>
                <Input
                  value={form.rollNo}
                  onChange={(e) => setForm((f) => ({ ...f, rollNo: e.target.value }))}
                  placeholder="e.g. 101"
                />
              </FormControl>
              <FormControl isRequired>
                <FormLabel>Class</FormLabel>
                <Input
                  value={form.class}
                  onChange={(e) => setForm((f) => ({ ...f, class: e.target.value }))}
                  placeholder="e.g. 10"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Section</FormLabel>
                <Input
                  value={form.section}
                  onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
                  placeholder="e.g. A"
                />
              </FormControl>
            </SimpleGrid>

            <Text mt="6" mb="2" fontSize="sm" fontWeight="600" color={textColor}>
              Parent / Guardian 1
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={form.parent1Name}
                  onChange={(e) => setForm((f) => ({ ...f, parent1Name: e.target.value }))}
                  placeholder="Parent 1 name"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Phone (WhatsApp)</FormLabel>
                <Input
                  value={form.parent1Phone}
                  onChange={(e) => setForm((f) => ({ ...f, parent1Phone: e.target.value }))}
                  placeholder="+91 98765 43210"
                />
              </FormControl>
            </SimpleGrid>

            <Text mt="4" mb="2" fontSize="sm" fontWeight="600" color={textColor}>
              Parent / Guardian 2 (optional)
            </Text>
            <SimpleGrid columns={{ base: 1, md: 2 }} gap="4">
              <FormControl>
                <FormLabel>Name</FormLabel>
                <Input
                  value={form.parent2Name}
                  onChange={(e) => setForm((f) => ({ ...f, parent2Name: e.target.value }))}
                  placeholder="Parent 2 name"
                />
              </FormControl>
              <FormControl>
                <FormLabel>Phone (WhatsApp)</FormLabel>
                <Input
                  value={form.parent2Phone}
                  onChange={(e) => setForm((f) => ({ ...f, parent2Phone: e.target.value }))}
                  placeholder="+91 98765 43211"
                />
              </FormControl>
            </SimpleGrid>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="brand" onClick={handleSaveStudent}>
              {editingId ? 'Update student' : 'Add student'}
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
