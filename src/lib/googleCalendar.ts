import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

// In-memory access token cache
let cachedAccessToken: string | null = null;

// Get the existing cached token or null
export const getCachedToken = (): string | null => {
  return cachedAccessToken;
};

// Clear the cached token on logout / state change
export const clearCachedToken = () => {
  cachedAccessToken = null;
};

// Set up Google Auth Provider with Calendar scopes
const getCalendarProvider = (): GoogleAuthProvider => {
  const provider = new GoogleAuthProvider();
  // Request Calendar Scopes
  provider.addScope('https://www.googleapis.com/auth/calendar');
  provider.addScope('https://www.googleapis.com/auth/calendar.events');
  return provider;
};

// Trigger google popup sign-in specifically for calendar scopes
export const connectCalendar = async (): Promise<string> => {
  try {
    const provider = getCalendarProvider();
    
    // Trigger Firebase sign in with popup
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (!credential || !credential.accessToken) {
      throw new Error('No access token returned from Google authentication provider.');
    }
    
    cachedAccessToken = credential.accessToken;
    return cachedAccessToken;
  } catch (error: any) {
    console.error('Failed to link Google Calendar:', error);
    throw error;
  }
};

// Fetch primary calendar events
export const listCalendarEvents = async (timeMin?: string): Promise<any[]> => {
  const token = getCachedToken();
  if (!token) {
    throw new Error('Authentication required: Google Calendar is not connected.');
  }

  // Construct URL with query parameters
  const params = new URLSearchParams({
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: '50',
  });
  
  if (timeMin) {
    params.append('timeMin', timeMin);
  } else {
    // Default to start of current month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    params.append('timeMin', startOfMonth.toISOString());
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Google Calendar List Error:', errorData);
    if (response.status === 401) {
      clearCachedToken();
      throw new Error('Google Calendar session expired. Please re-authenticate.');
    }
    throw new Error(errorData?.error?.message || 'Failed to retrieve calendar events.');
  }

  const data = await response.json();
  return data.items || [];
};

// Create a new event on primary calendar
export const createCalendarEvent = async (eventData: {
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime: string; timeZone: string };
  end: { dateTime: string; timeZone: string };
}): Promise<any> => {
  const token = getCachedToken();
  if (!token) {
    throw new Error('Authentication required: Google Calendar is not connected.');
  }

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Google Calendar Create Error:', errorData);
    if (response.status === 401) {
      clearCachedToken();
      throw new Error('Google Calendar session expired. Please re-authenticate.');
    }
    throw new Error(errorData?.error?.message || 'Failed to create calendar event.');
  }

  return response.json();
};

// Delete an event
export const deleteCalendarEvent = async (eventId: string): Promise<void> => {
  const token = getCachedToken();
  if (!token) {
    throw new Error('Authentication required: Google Calendar is not connected.');
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Google Calendar Delete Error:', errorData);
    if (response.status === 401) {
      clearCachedToken();
      throw new Error('Google Calendar session expired. Please re-authenticate.');
    }
    throw new Error(errorData?.error?.message || 'Failed to delete calendar event.');
  }
};

// Update an existing event
export const updateCalendarEvent = async (
  eventId: string,
  eventData: {
    summary: string;
    description?: string;
    location?: string;
    start: { dateTime: string; timeZone: string };
    end: { dateTime: string; timeZone: string };
  }
): Promise<any> => {
  const token = getCachedToken();
  if (!token) {
    throw new Error('Authentication required: Google Calendar is not connected.');
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('Google Calendar Update Error:', errorData);
    if (response.status === 401) {
      clearCachedToken();
      throw new Error('Google Calendar session expired. Please re-authenticate.');
    }
    throw new Error(errorData?.error?.message || 'Failed to update calendar event.');
  }

  return response.json();
};
