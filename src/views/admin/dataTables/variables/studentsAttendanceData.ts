export type StudentAttendanceRow = {
  id: string;
  studentName: string;
  rollNo: string;
  class: string;
  section: string;
  attendanceRegistries: number;
  parentsLinked: number;
  lastAttendanceDate: string;
  status: 'active' | 'inactive';
};

export const studentsAttendanceData: StudentAttendanceRow[] = [
  { id: '1', studentName: 'Rahul Sharma', rollNo: '101', class: '10', section: 'A', attendanceRegistries: 42, parentsLinked: 2, lastAttendanceDate: '13 Feb 2025', status: 'active' },
  { id: '2', studentName: 'Priya Patel', rollNo: '102', class: '10', section: 'A', attendanceRegistries: 38, parentsLinked: 2, lastAttendanceDate: '13 Feb 2025', status: 'active' },
  { id: '3', studentName: 'Amit Kumar', rollNo: '103', class: '10', section: 'B', attendanceRegistries: 35, parentsLinked: 1, lastAttendanceDate: '12 Feb 2025', status: 'active' },
  { id: '4', studentName: 'Sneha Reddy', rollNo: '104', class: '9', section: 'A', attendanceRegistries: 28, parentsLinked: 2, lastAttendanceDate: '13 Feb 2025', status: 'active' },
  { id: '5', studentName: 'Vikram Singh', rollNo: '105', class: '9', section: 'A', attendanceRegistries: 40, parentsLinked: 2, lastAttendanceDate: '13 Feb 2025', status: 'active' },
  { id: '6', studentName: 'Anita Desai', rollNo: '106', class: '9', section: 'B', attendanceRegistries: 0, parentsLinked: 0, lastAttendanceDate: '—', status: 'inactive' },
  { id: '7', studentName: 'Rajesh Nair', rollNo: '201', class: '8', section: 'A', attendanceRegistries: 45, parentsLinked: 1, lastAttendanceDate: '13 Feb 2025', status: 'active' },
  { id: '8', studentName: 'Kavita Joshi', rollNo: '202', class: '8', section: 'A', attendanceRegistries: 39, parentsLinked: 2, lastAttendanceDate: '12 Feb 2025', status: 'active' },
];
