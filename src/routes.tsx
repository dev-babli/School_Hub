import { Icon } from '@chakra-ui/react';
import {
  MdPerson,
  MdHome,
  MdSchool,
  MdAttachMoney,
  MdNotifications,
  MdCalendarToday,
  MdMenuBook,
  MdMessage,
  MdPeople,
  MdAssignment,
} from 'react-icons/md';
import { IRoute } from 'types/navigation';

const routes: IRoute[] = [
  {
    name: 'Dashboard',
    layout: '/admin',
    path: '/dashboard',
    icon: <Icon as={MdHome} width="20px" height="20px" color="inherit" />,
  },
  {
    name: 'Teachers',
    layout: '/admin',
    path: '/teachers',
    icon: <Icon as={MdPeople} width="20px" height="20px" color="inherit" />,
  },
  {
    name: 'Students',
    layout: '/admin',
    path: '/data-tables',
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
  },
  {
    name: 'Attendance',
    layout: '/admin',
    path: '/attendance',
    icon: <Icon as={MdAssignment} width="20px" height="20px" color="inherit" />,
  },
  {
    name: 'Finance',
    layout: '/admin',
    path: '/finance',
    icon: <Icon as={MdAttachMoney} width="20px" height="20px" color="inherit" />,
  },
  {
    name: 'Notice',
    layout: '/admin',
    path: '/notice',
    icon: <Icon as={MdNotifications} width="20px" height="20px" color="inherit" />,
  },
  {
    name: 'Calendar',
    layout: '/admin',
    path: '/calendar',
    icon: <Icon as={MdCalendarToday} width="20px" height="20px" color="inherit" />,
  },
  {
    name: 'Library',
    layout: '/admin',
    path: '/library',
    icon: <Icon as={MdMenuBook} width="20px" height="20px" color="inherit" />,
  },
  {
    name: 'Message',
    layout: '/admin',
    path: '/message',
    icon: <Icon as={MdMessage} width="20px" height="20px" color="inherit" />,
  },
  {
    name: 'Profile',
    layout: '/admin',
    path: '/profile',
    icon: <Icon as={MdPerson} width="20px" height="20px" color="inherit" />,
    secondary: true,
  },
];

export default routes;
