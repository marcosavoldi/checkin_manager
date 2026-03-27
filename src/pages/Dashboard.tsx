import { useEffect, useState } from 'react';
import {
  Title, Text, Button, Grid, Card, Badge, Group, Stack,
  Tabs, Modal, Box, ThemeIcon, Avatar, Paper
} from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendar, IconLayoutGrid, IconLogin, IconLogout,
  IconArrowRight
} from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { fetchUpcomingBookings, type Booking, type BookingSource } from '../services/bookingService';
import Loader from '../components/Loader';
import ErrorState from '../components/ErrorState';
import BookingDetailModal from '../components/BookingDetailModal';
import dayjs from 'dayjs';
import 'dayjs/locale/it';

dayjs.locale('it');

const SOURCE_COLORS: Record<BookingSource, string> = {
  airbnb: 'pink',
  booking: 'blue',
  direct: 'teal'
};
const SOURCE_LABELS: Record<BookingSource, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  direct: 'Diretta'
};

type BookingEventCompat = Booking;

function getBookingsForDay(bookings: Booking[], date: Date) {
  const d = dayjs(date);
  return bookings.filter(b =>
    d.isSame(dayjs(b.checkIn), 'day') || d.isSame(dayjs(b.checkOut), 'day')
  );
}

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<string>('cards');
  const [selectedBooking, setSelectedBooking] = useState<BookingEventCompat | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [dayModalOpened, { open: openDayModal, close: closeDayModal }] = useDisclosure(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchUpcomingBookings();
      setBookings(data);
    } catch {
      setError('Impossibile caricare le prenotazioni. Riprova più tardi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  if (loading) return <Loader message="Caricamento prenotazioni..." />;
  if (error) return <ErrorState message={error} onRetry={loadData} />;

  const isAdmin = user?.appRole === 'admin';
  const dayBookings = selectedDay ? getBookingsForDay(bookings, selectedDay) : [];

  const handleDayClick = (date: Date) => {
    const isCheckIn = bookings.some(b => dayjs(date).isSame(dayjs(b.checkIn), 'day'));
    const isCheckOut = bookings.some(b => dayjs(date).isSame(dayjs(b.checkOut), 'day'));
    
    if (isCheckIn || isCheckOut) {
      setSelectedDay(date);
      openDayModal();
    }
  };

  return (
    <Box>
      {/* ── Header ─────────────────────────────── */}
      <Group justify="space-between" mb="xs" align="center" wrap="nowrap">
        <Group gap="xs">
          <Avatar src={user?.photoURL} size="sm" radius="xl" />
          <div>
            <Title order={5} fw={700} lh={1.2}>{user?.displayName}</Title>
            <Text size="xs" c={isAdmin ? 'violet' : 'dimmed'} fw={500}>
              {isAdmin ? '✦ Admin' : 'Staff'}
            </Text>
          </div>
        </Group>
        <Button size="xs" color="red" variant="subtle" rightSection={<IconArrowRight size={13} />} onClick={logout}>
          Esci
        </Button>
      </Group>

      {/* ── Tab switcher ───────────────────────── */}
      <Tabs value={view} onChange={v => setView(v ?? 'cards')} mb="md">
        <Tabs.List grow>
          <Tabs.Tab value="cards" leftSection={<IconLayoutGrid size={14} />} style={{ flex: 1 }}>Lista</Tabs.Tab>
          <Tabs.Tab value="calendar" leftSection={<IconCalendar size={14} />} style={{ flex: 1 }}>Calendario</Tabs.Tab>
        </Tabs.List>
      </Tabs>

      {/* ── VISTA CARD ─────────────────────────── */}
      {view === 'cards' && (
        bookings.length === 0 ? (
          <Paper withBorder p="xl" radius="md" ta="center">
            <Text c="dimmed" fs="italic">Nessuna prenotazione imminente.</Text>
            <Text size="xs" c="dimmed" mt={4}>L'Admin può aggiungerne dalla sezione "Gestione Prenotazioni".</Text>
          </Paper>
        ) : (
          <Grid gutter="md">
            {bookings.map((b) => (
              <Grid.Col span={{ base: 12, sm: 6, lg: 4 }} key={b.id}>
                <Card shadow="xs" padding="md" radius="lg" withBorder h="100%">
                  <Group justify="space-between" mb="sm">
                    {isAdmin ? (
                      <Badge color={SOURCE_COLORS[b.source]} variant="light" size="sm" radius="sm">
                        {SOURCE_LABELS[b.source]}
                      </Badge>
                    ) : (
                      <Badge color="gray" variant="light" size="sm" radius="sm">
                        Prenotazione
                      </Badge>
                    )}
                    <Text size="xs" c="dimmed" fw={500}>
                      {b.adults}A {b.children > 0 && `+ ${b.children}B`}
                    </Text>
                  </Group>

                  <Stack gap={6} mb="md">
                    <Text size="sm" fw={700} truncate>
                      {isAdmin ? (b.guestName || 'Ospite') : 'Dettagli Prenotazione'}
                    </Text>
                    
                    <Group justify="space-between" align="center">
                      <Group gap={6}>
                        <ThemeIcon color="green" variant="light" size="sm" radius="sm">
                          <IconLogin size={12} />
                        </ThemeIcon>
                        <Text size="sm" c="dimmed">Check-in</Text>
                      </Group>
                      <Text fw={700} size="sm" c="green">
                        {dayjs(b.checkIn).format('ddd DD MMM')}
                      </Text>
                    </Group>

                    <Group justify="space-between" align="center">
                      <Group gap={6}>
                        <ThemeIcon color="red" variant="light" size="sm" radius="sm">
                          <IconLogout size={12} />
                        </ThemeIcon>
                        <Text size="sm" c="dimmed">Check-out</Text>
                      </Group>
                      <Text fw={700} size="sm" c="red">
                        {dayjs(b.checkOut).format('ddd DD MMM')}
                      </Text>
                    </Group>
                  </Stack>

                  <Button fullWidth size="xs" variant="light" color="violet" onClick={() => setSelectedBooking(b)}>
                    Note & Dettagli
                  </Button>
                </Card>
              </Grid.Col>
            ))}
          </Grid>
        )
      )}

      {/* ── VISTA CALENDARIO ───────────────────── */}
      {view === 'calendar' && (
        <Box>
          <Box style={{ maxWidth: 450, margin: '0 auto' }}>
            <Calendar
              locale="it"
              size="md"
              style={{ width: '100%' }}
              renderDay={(date) => {
                const d = dayjs(date).toDate();
                const isCheckIn = bookings.some(b => dayjs(d).isSame(dayjs(b.checkIn), 'day'));
                const isCheckOut = bookings.some(b => dayjs(d).isSame(dayjs(b.checkOut), 'day'));
                const isToday = dayjs(d).isSame(dayjs(), 'day');
                
                return (
                  <Stack
                    gap={2}
                    align="center"
                    justify="center"
                    style={{
                      position: 'relative',
                      width: '100%',
                      height: '100%',
                      cursor: (isCheckIn || isCheckOut) ? 'pointer' : 'default',
                      borderRadius: 8,
                      fontWeight: isToday ? 700 : undefined,
                      background: isToday ? 'var(--mantine-color-violet-light)' : undefined,
                      padding: 4
                    }}
                    onClick={() => handleDayClick(d)}
                  >
                    <Text size="sm" fw={isToday ? 700 : 500}>{d.getDate()}</Text>
                    <Group gap={2} justify="center" h={4} w="100%" wrap="nowrap">
                      {isCheckIn && (
                        <Box
                          style={{
                            height: 3,
                            flex: 1,
                            maxWidth: 12,
                            borderRadius: 2,
                            background: 'var(--mantine-color-green-6)',
                          }}
                        />
                      )}
                      {isCheckOut && (
                        <Box
                          style={{
                            height: 3,
                            flex: 1,
                            maxWidth: 12,
                            borderRadius: 2,
                            background: 'var(--mantine-color-red-6)',
                          }}
                        />
                      )}
                    </Group>
                  </Stack>
                );
              }}
            />
            <Text ta="center" size="xs" c="dimmed" mt="md">Clicca su un giorno con barre colorate per vedere i dettagli</Text>
          </Box>
        </Box>
      )}

      {/* ── Modale giorno cliccato ─────────────── */}
      <Modal
        opened={dayModalOpened}
        onClose={closeDayModal}
        title={<Text fw={700}>{selectedDay ? dayjs(selectedDay).format('dddd D MMMM YYYY') : ''}</Text>}
        centered
        size="sm"
      >
        <Stack gap="sm">
          {dayBookings.map(b => {
            const isCheckIn = dayjs(selectedDay).isSame(dayjs(b.checkIn), 'day');
            const isCheckOut = dayjs(selectedDay).isSame(dayjs(b.checkOut), 'day');
            return (
              <Paper key={b.id} withBorder p="sm" radius="md">
                <Group justify="space-between" mb="xs">
                  <Badge color={SOURCE_COLORS[b.source]} variant="light" size="sm">
                    {SOURCE_LABELS[b.source]}
                  </Badge>
                  <Group gap={4}>
                    {isCheckIn && <Badge color="green" variant="dot" size="sm">Check-in</Badge>}
                    {isCheckOut && <Badge color="red" variant="dot" size="sm">Check-out</Badge>}
                  </Group>
                </Group>
                {b.guestName && <Text size="sm" fw={500}>{b.guestName}</Text>}
                <Text size="xs" c="dimmed" mt={4}>
                  {dayjs(b.checkIn).format('DD MMM')} → {dayjs(b.checkOut).format('DD MMM YYYY')}
                </Text>
                <Button
                  fullWidth mt="sm" size="xs" variant="light" color="violet"
                  onClick={() => { closeDayModal(); setSelectedBooking(b); }}
                >
                  Note & Dettagli
                </Button>
              </Paper>
            );
          })}
        </Stack>
      </Modal>

      {/* ── Modale note prenotazione ───────────── */}
      <BookingDetailModal
        opened={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        booking={selectedBooking}
      />
    </Box>
  );
}
