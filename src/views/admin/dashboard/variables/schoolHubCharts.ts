type ApexGeneric = Record<string, unknown>;

// Students overview - Boys vs Girls doughnut
export const studentsOverviewData = [47, 53];
export const studentsOverviewOptions: ApexGeneric = {
  labels: ['Boys', 'Girls'],
  colors: ['#4318FF', '#FFB547'],
  chart: { type: 'donut', width: '100%' },
  legend: { show: false },
  dataLabels: { enabled: false },
  plotOptions: {
    pie: {
      donut: { size: '70%' },
    },
  },
};

// Attendance - Present vs Absent by weekday
export const attendanceOverviewData = [
  { name: 'Total Present', data: [85, 90, 95, 88, 92] },
  { name: 'Total Absent', data: [15, 10, 5, 12, 8] },
];
export const attendanceOverviewOptions: ApexGeneric = {
  chart: { toolbar: { show: false }, stacked: true },
  tooltip: { theme: 'light' },
  xaxis: {
    categories: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    labels: { style: { colors: '#A3AED0', fontSize: '12px' } },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    min: 0,
    max: 100,
    tickAmount: 4,
    labels: { style: { colors: '#CBD5E0', fontSize: '12px' } },
  },
  grid: {
    strokeDashArray: 5,
    yaxis: { lines: { show: true } },
    xaxis: { lines: { show: false } },
  },
  colors: ['#FFB547', '#4318FF'],
  fill: { opacity: 1 },
  dataLabels: { enabled: false },
  plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
  legend: {
    show: true,
    position: 'top',
    horizontalAlign: 'right',
    fontSize: '12px',
  },
};
