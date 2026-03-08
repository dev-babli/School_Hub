'use client';

import { Box } from '@chakra-ui/react';
import StudentsAttendanceTable from 'views/admin/dataTables/components/StudentsAttendanceTable';
import { studentsAttendanceData } from 'views/admin/dataTables/variables/studentsAttendanceData';

export default function DataTables() {
  return (
    <Box pt={{ base: '130px', md: '80px', xl: '80px' }}>
      <StudentsAttendanceTable tableData={studentsAttendanceData} />
    </Box>
  );
}
