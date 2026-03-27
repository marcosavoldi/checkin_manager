import ICAL from 'ical.js';
import dayjs from 'dayjs';

export interface BookingEvent {
  id: string;
  startDate: Date;
  endDate: Date;
  source: 'airbnb' | 'booking' | 'unknown';
  summary: string;
}

export function aggregateEvents(events: BookingEvent[]): BookingEvent[] {
  const aggregated: BookingEvent[] = [];
  const sorted = [...events].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  
  for (const event of sorted) {
    const isDuplicate = aggregated.some(
      aggr => dayjs(aggr.startDate).isSame(dayjs(event.startDate), 'day') && 
              dayjs(aggr.endDate).isSame(dayjs(event.endDate), 'day')
    );
    if (!isDuplicate) {
      aggregated.push(event);
    }
  }
  
  return aggregated;
}

export async function fetchCalendars(): Promise<BookingEvent[]> {
  const urls: { url: string | undefined, source: 'airbnb' | 'booking' }[] = [
    { url: import.meta.env.VITE_AIRBNB_ICAL_URL, source: 'airbnb' },
    { url: import.meta.env.VITE_BOOKING_ICAL_URL, source: 'booking' }
  ];

  const allEvents: BookingEvent[] = [];

  for (const item of urls) {
    if (!item.url) continue;

    try {
      // Usiamo corsproxy.io come proxy CORS affidabile (allorigins bloccava su localhost)
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(item.url)}`;
      const response = await fetch(proxyUrl);
      if (!response.ok) throw new Error(`Network error: ${response.status}`);
      
      const icalData = await response.text();
      const jcalData = ICAL.parse(icalData);
      const comp = new ICAL.Component(jcalData);
      const vevents = comp.getAllSubcomponents('vevent');
      
      const parsedEvents = vevents.map(vevent => {
        const event = new ICAL.Event(vevent);
        let summary = event.summary || '';
        
        // Pulizia nomi base, spesso non c'è il nome ospite per privacy.
        if (summary.includes('Reserved') || summary.includes('Not available')) {
          summary = `${item.source.charAt(0).toUpperCase() + item.source.slice(1)} (Bloccato)`;
        } else if (summary === '') {
          summary = `${item.source.charAt(0).toUpperCase() + item.source.slice(1)} (Ospite Privato)`;
        }

        return {
          id: event.uid,
          startDate: event.startDate.toJSDate(),
          endDate: event.endDate.toJSDate(),
          source: item.source,
          summary: summary
        } as BookingEvent;
      });
      
      // Filtriamo per non riempire la memoria di eventi vecchissimi
      const validEvents = parsedEvents.filter(evt => dayjs(evt.endDate).isAfter(dayjs().subtract(7, 'day')));
      
      allEvents.push(...validEvents);
    } catch (error) {
      console.error(`Errore caricamento calendario da ${item.source}:`, error);
    }
  }

  if (allEvents.length === 0) {
    return [
      { id: 'mock-fake', startDate: dayjs().toDate(), endDate: dayjs().add(2, 'day').toDate(), source: 'unknown', summary: 'Nessun URL iCal configurato.' }
    ];
  }

  return aggregateEvents(allEvents);
}
