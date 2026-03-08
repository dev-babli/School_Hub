type ApexGeneric = Record<string, unknown>;

export const attendanceTimelineData = [
  {
    name: 'Students',
    data: [12, 45, 89, 76, 54, 32, 18, 10, 6],
  },
];

export const attendanceTimelineOptions: ApexGeneric = {
  chart: { toolbar: { show: false } },
  tooltip: { theme: 'dark' },
  xaxis: {
    categories: ['7 AM', '8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM'],
    labels: { style: { colors: '#A3AED0', fontSize: '12px' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    show: true,
    labels: { style: { colors: '#CBD5E0', fontSize: '12px' } },
  },
  grid: {
    strokeDashArray: 5,
    yaxis: { lines: { show: true } },
    xaxis: { lines: { show: false } },
  },
  fill: {
    type: 'gradient',
    gradient: {
      type: 'vertical',
      shadeIntensity: 1,
      opacityFrom: 0.7,
      opacityTo: 0.3,
      colorStops: [
        [
          { offset: 0, color: '#4318FF', opacity: 1 },
          { offset: 100, color: 'rgba(67, 24, 255, 0.28)', opacity: 1 },
        ],
      ],
    },
  },
  dataLabels: { enabled: false },
  plotOptions: { bar: { borderRadius: 6, columnWidth: '60%' } },
};

export const notificationSuccessPieData = [92, 8];
export const notificationSuccessPieOptions: ApexGeneric = {
  labels: ['Delivered', 'Failed'],
  colors: ['#01B574', '#E53E3E'],
  chart: { width: '100%' },
  legend: { position: 'bottom', fontSize: '14px' },
  dataLabels: { enabled: true },
};
