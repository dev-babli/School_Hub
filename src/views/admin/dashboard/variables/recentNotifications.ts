export type RecentNotification = {
  studentName: string;
  time: string;
  status: 'Delivered' | 'Pending' | 'Failed';
};

export const recentNotificationsData: RecentNotification[] = [
  { studentName: 'Rahul Sharma', time: '08:15 AM', status: 'Delivered' },
  { studentName: 'Priya Patel', time: '08:16 AM', status: 'Delivered' },
  { studentName: 'Amit Kumar', time: '08:17 AM', status: 'Pending' },
  { studentName: 'Sneha Reddy', time: '08:18 AM', status: 'Failed' },
  { studentName: 'Vikram Singh', time: '08:19 AM', status: 'Delivered' },
  { studentName: 'Anita Desai', time: '08:20 AM', status: 'Delivered' },
];
