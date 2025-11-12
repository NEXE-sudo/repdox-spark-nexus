// Format date to YYYYMMDDTHHMMSSZ for calendar links
const formatDateForCalendar = (date: string | Date) => {
  return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
};

interface CalendarEvent {
  title: string;
  start_at: string;
  end_at?: string;
  location: string;
  short_blurb?: string;
  overview?: string;
  long_description?: string;
}

// Generate Google Calendar URL
export const getGoogleCalendarUrl = (event: CalendarEvent) => {
  const startDate = formatDateForCalendar(event.start_at);
  const endDate = event.end_at 
    ? formatDateForCalendar(event.end_at)
    : formatDateForCalendar(new Date(new Date(event.start_at).getTime() + 2 * 60 * 60 * 1000)); // Default 2hr duration
  
  const description = event.overview || event.long_description || event.short_blurb || '';
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${startDate}/${endDate}`,
    details: description,
    location: event.location,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

// Generate Outlook Calendar URL
export const getOutlookCalendarUrl = (event: CalendarEvent) => {
  const startDate = new Date(event.start_at).toISOString();
  const endDate = event.end_at 
    ? new Date(event.end_at).toISOString()
    : new Date(new Date(event.start_at).getTime() + 2 * 60 * 60 * 1000).toISOString();
  
  const description = event.overview || event.long_description || event.short_blurb || '';
  
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: event.title,
    startdt: startDate,
    enddt: endDate,
    body: description,
    location: event.location,
  });
  
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};

// Generate .ics file for Apple Calendar and others
export const generateICSFile = (event: CalendarEvent) => {
  const startDate = formatDateForCalendar(event.start_at);
  const endDate = event.end_at 
    ? formatDateForCalendar(event.end_at)
    : formatDateForCalendar(new Date(new Date(event.start_at).getTime() + 2 * 60 * 60 * 1000));
  
  const description = event.overview || event.long_description || event.short_blurb || '';
  
  const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Your Organization//Events//EN
BEGIN:VEVENT
DTSTART:${startDate}
DTEND:${endDate}
SUMMARY:${event.title}
DESCRIPTION:${description.replace(/\n/g, '\\n')}
LOCATION:${event.location}
STATUS:CONFIRMED
SEQUENCE:0
END:VEVENT
END:VCALENDAR`;

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `${event.title.replace(/\s+/g, '_')}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};