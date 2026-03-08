'use client';

import {
  Badge,
  Box,
  Flex,
  IconButton,
  SimpleGrid,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import MiniStatistics from 'components/card/MiniStatistics';
import IconBox from 'components/icons/IconBox';
import Card from 'components/card/Card';
import BarChart from 'components/charts/BarChart';
import PieChart from 'components/charts/PieChart';
import { Icon } from '@chakra-ui/react';
import {
  MdPeople,
  MdPerson,
  MdGroup,
  MdEmojiEvents,
  MdMoreVert,
  MdCheck,
} from 'react-icons/md';
import {
  studentsOverviewData,
  studentsOverviewOptions,
  attendanceOverviewData,
  attendanceOverviewOptions,
} from 'views/admin/dashboard/variables/schoolHubCharts';
import { SearchBar } from 'components/navbar/searchBar/SearchBar';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import { useState } from 'react';

function KpiCard({
  name,
  value,
  change,
  isPositive,
  bgColor,
}: {
  name: string;
  value: string;
  change: string;
  isPositive: boolean;
  bgColor: string;
}) {
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const textColorSecondary = 'secondaryGray.600';

  return (
    <Card py="15px" position="relative" overflow="hidden">
      <Box
        position="absolute"
        top="0"
        right="0"
        bottom="0"
        left="0"
        bg={bgColor}
        opacity="0.15"
        pointerEvents="none"
      />
      <Flex my="auto" h="100%" align="center" justify="space-between" position="relative">
        <Box>
          <Text color={textColorSecondary} fontSize="sm" fontWeight="500">
            {name}
          </Text>
          <Text color={textColor} fontSize="2xl" fontWeight="700">
            {value}
          </Text>
          <Badge
            bg={isPositive ? 'green.100' : 'yellow.100'}
            color={isPositive ? 'green.700' : 'yellow.700'}
            fontSize="xs"
            px="2"
            py="0.5"
            borderRadius="md"
            mt="1"
          >
            {change} since last month
          </Badge>
        </Box>
        <IconButton
          aria-label="More options"
          icon={<Icon as={MdMoreVert} />}
          variant="ghost"
          size="sm"
          position="absolute"
          top="8px"
          right="8px"
        />
      </Flex>
    </Card>
  );
}

export default function DashboardPage() {
  const brandColor = useColorModeValue('brand.500', 'white');
  const boxBg = useColorModeValue('secondaryGray.300', 'whiteAlpha.100');
  const textColor = useColorModeValue('secondaryGray.900', 'white');
  const cardBg = useColorModeValue('white', 'whiteAlpha.100');

  const [calendarDate, setCalendarDate] = useState(new Date(2030, 8, 22)); // Sept 22, 2030

  const agendaEvents = [
    { time: '08:00 am', title: 'All Grade Homeroom & Announcement', color: 'purple.100' },
    { time: '10:00 am', title: 'Grade 3-5 Math Review & Practice', color: 'yellow.100' },
    { time: '10:30 am', title: 'Grade 6-8 Science Experiment & Discussion', color: 'blue.100' },
  ];

  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      {/* Header: Title + Feature tags + Search */}
      <Flex
        direction={{ base: 'column', md: 'row' }}
        justify="space-between"
        align={{ base: 'stretch', md: 'center' }}
        mb="24px"
        gap="16px"
        flexWrap="wrap"
      >
        <Box>
          <Text color={textColor} fontSize="2xl" fontWeight="700" mb="12px">
            School Management Admin Dashboard
          </Text>
          <Flex gap="8px" flexWrap="wrap">
            <Badge colorScheme="green" px="3" py="1" borderRadius="full">
              <Icon as={MdCheck} w="14px" h="14px" me="4px" verticalAlign="middle" />
              Auto Layout
            </Badge>
            <Badge colorScheme="blue" px="3" py="1" borderRadius="full">
              <Icon as={MdCheck} w="14px" h="14px" me="4px" verticalAlign="middle" />
              Modern Design Style
            </Badge>
            <Badge colorScheme="purple" px="3" py="1" borderRadius="full">
              <Icon as={MdCheck} w="14px" h="14px" me="4px" verticalAlign="middle" />
              30+ Unique Widgets
            </Badge>
          </Flex>
        </Box>
        <Box w={{ base: '100%', md: '280px' }}>
          <SearchBar borderRadius="30px" />
        </Box>
      </Flex>

      {/* KPI Cards */}
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="20px" mb="24px">
        <KpiCard
          name="Students"
          value="124,684"
          change="↑15%"
          isPositive
          bgColor="purple.400"
        />
        <KpiCard
          name="Teachers"
          value="12,379"
          change="↓3%"
          isPositive={false}
          bgColor="yellow.400"
        />
        <KpiCard
          name="Staffs"
          value="29,300"
          change="↓3%"
          isPositive={false}
          bgColor="purple.400"
        />
        <KpiCard
          name="Awards"
          value="95,800"
          change="↑5%"
          isPositive
          bgColor="green.400"
        />
      </SimpleGrid>

      {/* Middle row: Students + Attendance + Agenda */}
      <SimpleGrid columns={{ base: 1, lg: 3 }} gap="20px" mb="24px">
        {/* Students Overview - Doughnut */}
        <Card p="20px" display="flex" flexDirection="column" alignItems="center">
          <Flex w="100%" justify="space-between" align="center" mb="16px">
            <Text color={textColor} fontSize="md" fontWeight="600">
              Students
            </Text>
            <IconButton aria-label="More" icon={<Icon as={MdMoreVert} />} variant="ghost" size="sm" />
          </Flex>
          <Box h="200px" w="100%" position="relative">
            <PieChart chartData={studentsOverviewData} chartOptions={studentsOverviewOptions} />
            <Flex
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              direction="column"
              align="center"
              pointerEvents="none"
            >
              <Flex gap="2">
                <Box w="24px" h="24px" borderRadius="full" bg="brand.500" />
                <Box w="24px" h="24px" borderRadius="full" bg="orange.400" />
              </Flex>
            </Flex>
          </Box>
          <Flex gap="24px" mt="12px" justify="center">
            <Flex align="center" gap="2">
              <Box w="12px" h="12px" borderRadius="full" bg="brand.500" />
              <Text fontSize="sm" color="secondaryGray.600">45,414 Boys (47%)</Text>
            </Flex>
            <Flex align="center" gap="2">
              <Box w="12px" h="12px" borderRadius="full" bg="orange.400" />
              <Text fontSize="sm" color="secondaryGray.600">40,270 Girls (53%)</Text>
            </Flex>
          </Flex>
        </Card>

        {/* Attendance - Bar chart */}
        <Card p="20px">
          <Flex w="100%" justify="space-between" align="center" mb="16px" flexWrap="wrap" gap="8px">
            <Text color={textColor} fontSize="md" fontWeight="600">
              Attendance
            </Text>
            <Flex gap="2">
              <Badge colorScheme="yellow" fontSize="xs">Weekly</Badge>
              <Badge colorScheme="blue" fontSize="xs">Grade 3</Badge>
            </Flex>
          </Flex>
          <Box h="200px" w="100%">
            <BarChart
              chartData={attendanceOverviewData}
              chartOptions={attendanceOverviewOptions}
            />
          </Box>
        </Card>

        {/* Agenda - Calendar + Events */}
        <Card p="20px">
          <Flex w="100%" justify="space-between" align="center" mb="16px">
            <Text color={textColor} fontSize="md" fontWeight="600">
              Agenda
            </Text>
            <IconButton aria-label="More" icon={<Icon as={MdMoreVert} />} variant="ghost" size="sm" />
          </Flex>
          <Box
            sx={{
              '& .react-calendar': { width: '100%', border: 'none', fontFamily: 'inherit' },
              '& .react-calendar__month-view__days__day--neighboringMonth': { color: 'gray.300' },
              '& .react-calendar__tile--active': {
                bg: 'brand.500',
                color: 'white',
                borderRadius: 'full',
              },
            }}
          >
            <Calendar
              value={calendarDate}
              onChange={(v: Date) => setCalendarDate(v)}
              view="month"
              showNavigation
              formatShortWeekday={(_, d) => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d.getDay()]}
            />
          </Box>
          <Flex direction="column" gap="8px" mt="16px">
            {agendaEvents.map((ev, i) => (
              <Flex
                key={i}
                align="center"
                gap="3"
                p="8px"
                borderRadius="8px"
                bg={ev.color}
              >
                <Text fontSize="xs" fontWeight="600" color="gray.700" minW="70px">
                  {ev.time}
                </Text>
                <Text fontSize="sm" color={textColor}>{ev.title}</Text>
              </Flex>
            ))}
          </Flex>
        </Card>
      </SimpleGrid>

      {/* Messages */}
      <Card p="20px">
        <Flex w="100%" justify="space-between" align="center" mb="16px">
          <Text color={textColor} fontSize="md" fontWeight="600">
            Messages
          </Text>
          <Text as="a" href="#" color="brand.500" fontSize="sm" fontWeight="600" cursor="pointer">
            View All
          </Text>
        </Flex>
        <Flex align="center" gap="3" p="12px" borderRadius="8px" bg={boxBg} _hover={{ bg: 'gray.100' }}>
          <Box
            w="40px"
            h="40px"
            borderRadius="full"
            bg="brand.500"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text color="white" fontSize="sm" fontWeight="700">LR</Text>
          </Box>
          <Box flex="1">
            <Text color={textColor} fontWeight="600" fontSize="sm">Dr. Lila Ramirez</Text>
            <Text color="secondaryGray.600" fontSize="xs">9:00 AM</Text>
          </Box>
        </Flex>
      </Card>
    </Box>
  );
}
