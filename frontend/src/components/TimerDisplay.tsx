import React from 'react';

interface TimerDisplayProps {
  startedAt: string | null;
  completedAt?: string | null;
  className?: string;
}

/**
 * TimerDisplay - Displays start date and time for a flow or task
 *
 * Shows the date and time when the flow/task was started
 *
 * @param startedAt - ISO timestamp when flow/task started
 * @param completedAt - Optional ISO timestamp when completed (shows status badge)
 * @param className - Optional CSS classes for styling
 */
const TimerDisplay: React.FC<TimerDisplayProps> = ({
  startedAt,
  completedAt = null,
  className = ''
}) => {
  if (!startedAt) {
    return <span className={className}>Not started</span>;
  }

  const formatStartTime = (): string => {
    const start = new Date(startedAt);

    // Format: "Jan 15, 2025 at 2:30 PM"
    const dateOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    };
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };

    const dateStr = start.toLocaleDateString('en-US', dateOptions);
    const timeStr = start.toLocaleTimeString('en-US', timeOptions);

    return `${dateStr} at ${timeStr}`;
  };

  const startTimeDisplay = formatStartTime();
  const statusBadge = completedAt ? (
    <span className="badge badge-success badge-sm ml-2">Completed</span>
  ) : (
    <span className="badge badge-info badge-sm ml-2">Active</span>
  );

  return (
    <span className={className}>
      Started: {startTimeDisplay}
      {statusBadge}
    </span>
  );
};

export default TimerDisplay;
