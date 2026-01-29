/**
 * Date utility functions for the performance evaluator app.
 */

export function getTodayString() {
  const now = new Date();
  return formatDateString(now);
}

export function formatDateString(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatDisplayDate(dateString) {
  const [y, m, d] = dateString.split('-');
  return `${m}/${d}/${y}`;
}

export function formatTimestamp(isoString) {
  if (!isoString) return '';
  // isoString comes from SQLite as "YYYY-MM-DD HH:MM:SS"
  const parts = isoString.split(' ');
  if (parts.length < 2) return formatDisplayDate(isoString);
  const datePart = formatDisplayDate(parts[0]);
  const timeParts = parts[1].split(':');
  let hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${datePart} ${hours}:${minutes} ${ampm}`;
}

export function getDateRange(period) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-indexed
  const quarter = Math.floor(month / 3);

  switch (period) {
    case 'current_month': {
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0);
      return {
        startDate: formatDateString(start),
        endDate: formatDateString(end),
        label: `${start.toLocaleString('default', { month: 'long' })} ${year}`,
      };
    }
    case 'previous_month': {
      const start = new Date(year, month - 1, 1);
      const end = new Date(year, month, 0);
      return {
        startDate: formatDateString(start),
        endDate: formatDateString(end),
        label: `${start.toLocaleString('default', { month: 'long' })} ${start.getFullYear()}`,
      };
    }
    case 'current_quarter': {
      const qStart = quarter * 3;
      const start = new Date(year, qStart, 1);
      const end = new Date(year, qStart + 3, 0);
      return {
        startDate: formatDateString(start),
        endDate: formatDateString(end),
        label: `Q${quarter + 1} ${year}`,
      };
    }
    case 'previous_quarter': {
      const pq = quarter === 0 ? 3 : quarter - 1;
      const pqYear = quarter === 0 ? year - 1 : year;
      const qStart = pq * 3;
      const start = new Date(pqYear, qStart, 1);
      const end = new Date(pqYear, qStart + 3, 0);
      return {
        startDate: formatDateString(start),
        endDate: formatDateString(end),
        label: `Q${pq + 1} ${pqYear}`,
      };
    }
    case 'current_year': {
      const start = new Date(year, 0, 1);
      const end = new Date(year, 11, 31);
      return {
        startDate: formatDateString(start),
        endDate: formatDateString(end),
        label: `${year}`,
      };
    }
    case 'previous_year': {
      const start = new Date(year - 1, 0, 1);
      const end = new Date(year - 1, 11, 31);
      return {
        startDate: formatDateString(start),
        endDate: formatDateString(end),
        label: `${year - 1}`,
      };
    }
    default:
      return getDateRange('current_month');
  }
}

export const PERIOD_OPTIONS = [
  { key: 'current_month', label: 'Current Month' },
  { key: 'previous_month', label: 'Previous Month' },
  { key: 'current_quarter', label: 'Current Quarter' },
  { key: 'previous_quarter', label: 'Previous Quarter' },
  { key: 'current_year', label: 'Current Year' },
  { key: 'previous_year', label: 'Previous Year' },
];
