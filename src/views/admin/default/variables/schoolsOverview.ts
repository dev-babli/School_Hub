export type SchoolOverview = {
  id: string;
  name: string;
  students: number;
  attendanceToday: number;
  notificationsSent: number;
  delivered: number;
  failed: number;
  status: 'active' | 'inactive';
};

export const schoolsOverviewData: SchoolOverview[] = [
  {
    id: 'school-1',
    name: 'Green Valley International School',
    students: 1250,
    attendanceToday: 342,
    notificationsSent: 328,
    delivered: 315,
    failed: 13,
    status: 'active',
  },
  {
    id: 'school-2',
    name: 'Riverside Academy',
    students: 890,
    attendanceToday: 256,
    notificationsSent: 248,
    delivered: 242,
    failed: 6,
    status: 'active',
  },
  {
    id: 'school-3',
    name: 'Sunrise Public School',
    students: 2100,
    attendanceToday: 589,
    notificationsSent: 572,
    delivered: 558,
    failed: 14,
    status: 'active',
  },
  {
    id: 'school-4',
    name: 'Central High School',
    students: 680,
    attendanceToday: 198,
    notificationsSent: 195,
    delivered: 188,
    failed: 7,
    status: 'active',
  },
];

export function getOverviewStats(schools: SchoolOverview[]) {
  return {
    totalSchools: schools.length,
    totalStudents: schools.reduce((s, sc) => s + sc.students, 0),
    totalAttendanceToday: schools.reduce((s, sc) => s + sc.attendanceToday, 0),
    totalNotificationsSent: schools.reduce((s, sc) => s + sc.notificationsSent, 0),
    activeSchools: schools.filter((sc) => sc.status === 'active').length,
  };
}
