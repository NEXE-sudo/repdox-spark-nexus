/**
 * Convert a date to relative time format (e.g., "2h", "3m", "5d")
 * Similar to Twitter's time display
 */
export function getRelativeTime(date: string | Date): string {
  const now = new Date();
  const postDate = new Date(date);
  const diffInSeconds = Math.floor((now.getTime() - postDate.getTime()) / 1000);

  // Less than a minute
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s`;
  }

  // Less than an hour
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m`;
  }

  // Less than a day
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours}h`;
  }

  // Less than a week
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return `${diffInDays}d`;
  }

  // More than a week - show actual date
  const month = postDate.toLocaleDateString("en-US", { month: "short" });
  const day = postDate.getDate();
  const year = postDate.getFullYear();
  const currentYear = now.getFullYear();

  // If same year, don't show year
  if (year === currentYear) {
    return `${month} ${day}`;
  }

  return `${month} ${day}, ${year}`;
}
