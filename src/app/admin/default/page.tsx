'use client';

import {
  Box,
  Button,
  Flex,
  SimpleGrid,
  Table,
  Tbody,
  Td,
  Text,
  Th,
  Thead,
  Tr,
  useColorModeValue,
  Badge,
  Link,
} from '@chakra-ui/react';
import MiniStatistics from 'components/card/MiniStatistics';
import IconBox from 'components/icons/IconBox';
import Card from 'components/card/Card';
import { Icon } from '@chakra-ui/react';
import {
  MdSchool,
  MdPeople,
  MdSend,
  MdCheckCircle,
  MdAdd,
  MdSettings,
} from 'react-icons/md';
import {
  schoolsOverviewData,
  getOverviewStats,
} from 'views/admin/default/variables/schoolsOverview';
import NextLink from 'next/link';

export default function Default() {
  const brandColor = useColorModeValue('brand.500', 'white');
  const boxBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const borderColor = useColorModeValue('gray.200', 'whiteAlpha.100');

  const stats = getOverviewStats(schoolsOverviewData);

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {/* Overview headline */}
      <Flex justify="space-between" align="center" mb="24px" flexWrap="wrap" gap="16px">
        <Text color={textColor} fontSize="2xl" fontWeight="700">
          Manage Schools
        </Text>
        <Button leftIcon={<Icon as={MdAdd} />} colorScheme="brand" size="sm">
          Add school
        </Button>
      </Flex>

      {/* Summary stats */}
      <SimpleGrid
        columns={{ base: 1, md: 2, lg: 3, xl: 5 }}
        gap="20px"
        mb="24px"
      >
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg={boxBg}
              icon={<Icon w="32px" h="32px" as={MdSchool} color={brandColor} />}
            />
          }
          name="Total Schools"
          value={String(stats.totalSchools)}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg={boxBg}
              icon={<Icon w="32px" h="32px" as={MdPeople} color={brandColor} />}
            />
          }
          name="Total Students"
          value={stats.totalStudents.toLocaleString()}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg={boxBg}
              icon={<Icon w="32px" h="32px" as={MdCheckCircle} color="green.500" />}
            />
          }
          name="Attendance Today"
          value={stats.totalAttendanceToday.toLocaleString()}
        />
        <MiniStatistics
          startContent={
            <IconBox
              w="56px"
              h="56px"
              bg={boxBg}
              icon={<Icon w="32px" h="32px" as={MdSend} color={brandColor} />}
            />
          }
          name="Notifications Sent"
          value={stats.totalNotificationsSent.toLocaleString()}
        />
        <MiniStatistics
          name="Active Schools"
          value={`${stats.activeSchools} / ${stats.totalSchools}`}
        />
      </SimpleGrid>

      {/* Schools table */}
      <Card flexDirection="column" w="100%" px="0px" overflowX={{ sm: 'scroll', lg: 'hidden' }}>
        <Flex px="25px" mb="8px" justifyContent="space-between" align="center">
          <Text color={textColor} fontSize="22px" fontWeight="700" lineHeight="100%">
            Your Schools
          </Text>
          <Text fontSize="sm" color="secondaryGray.600">
            Click Manage to view attendance and notifications for a school
          </Text>
        </Flex>
        <Box>
          <Table variant="simple" color="gray.500" mb="24px" mt="12px">
            <Thead>
              <Tr>
                <Th
                  pe="10px"
                  borderColor={borderColor}
                  fontSize={{ sm: '10px', lg: '12px' }}
                  color="gray.400"
                >
                  SCHOOL
                </Th>
                <Th
                  pe="10px"
                  borderColor={borderColor}
                  fontSize={{ sm: '10px', lg: '12px' }}
                  color="gray.400"
                >
                  STUDENTS
                </Th>
                <Th
                  pe="10px"
                  borderColor={borderColor}
                  fontSize={{ sm: '10px', lg: '12px' }}
                  color="gray.400"
                >
                  ATTENDANCE TODAY
                </Th>
                <Th
                  pe="10px"
                  borderColor={borderColor}
                  fontSize={{ sm: '10px', lg: '12px' }}
                  color="gray.400"
                >
                  NOTIFICATIONS
                </Th>
                <Th
                  pe="10px"
                  borderColor={borderColor}
                  fontSize={{ sm: '10px', lg: '12px' }}
                  color="gray.400"
                >
                  STATUS
                </Th>
                <Th
                  pe="10px"
                  borderColor={borderColor}
                  fontSize={{ sm: '10px', lg: '12px' }}
                  color="gray.400"
                >
                  ACTIONS
                </Th>
              </Tr>
            </Thead>
            <Tbody>
              {schoolsOverviewData.map((school) => (
                <Tr key={school.id}>
                  <Td
                    fontSize="sm"
                    fontWeight="700"
                    color={textColor}
                    borderColor="transparent"
                  >
                    {school.name}
                  </Td>
                  <Td
                    fontSize="sm"
                    fontWeight="600"
                    color={textColor}
                    borderColor="transparent"
                  >
                    {school.students.toLocaleString()}
                  </Td>
                  <Td
                    fontSize="sm"
                    fontWeight="600"
                    color={textColor}
                    borderColor="transparent"
                  >
                    {school.attendanceToday}
                  </Td>
                  <Td
                    fontSize="sm"
                    fontWeight="600"
                    color={textColor}
                    borderColor="transparent"
                  >
                    {school.delivered} / {school.notificationsSent}
                    {school.failed > 0 && (
                      <Text as="span" color="red.500" fontSize="xs" ml="1">
                        ({school.failed} failed)
                      </Text>
                    )}
                  </Td>
                  <Td borderColor="transparent">
                    <Badge
                      colorScheme={school.status === 'active' ? 'green' : 'gray'}
                      fontSize="xs"
                    >
                      {school.status}
                    </Badge>
                  </Td>
                  <Td borderColor="transparent">
                    <Button
                      size="xs"
                      variant="outline"
                      colorScheme="brand"
                      leftIcon={<Icon as={MdSettings} />}
                      as={NextLink}
                      href={`/admin/dashboard?school=${school.id}`}
                    >
                      Manage
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      </Card>

      {/* Short description */}
      <Card p="20px" mt="20px">
        <Text color="secondaryGray.600" fontSize="sm">
          This is your central overview for all schools using the Attendance Manager. Add schools,
          then use <strong>Manage</strong> to open attendance, notifications, and settings for
          each school. The dashboard view shows detailed stats for the selected school.
        </Text>
      </Card>
    </Box>
  );
}
