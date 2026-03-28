import { useEffect, useState } from 'react';
import {
  Title, Text, Button, Grid, Card, Badge, Group, Stack,
  Tabs, Modal, Box, ThemeIcon, Avatar, Paper, Collapse, Divider
} from '@mantine/core';
import { Calendar } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import {
  IconCalendar, IconLayoutGrid, IconLogin, IconLogout,
  IconArrowRight, IconUsers, IconChevronDown, IconChevronUp, IconNotes
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

const NOTE_THRESHOLD = 120;

function StaffNote({ note }: { note: string }) {
  const [expanded, setExpanded] = useState(false);
  if (!note) return null;
  const isLong = note.length > NOTE_THRESHOLD;
  return (
    <Box
      mt={8}
      p="xs"
      style={{
        background: 'var(--mantine-color-blue-light)',
        borderRadius: 8,
        borderLeft: '3px solid var(--mantine-color-blue-5)'
      }}
    >
      <Group gap={5} mb={3}>
        <IconNotes size={12} color="var(--mantine-color-blue-6)" />
        <Text size="xs" fw={700} c="blue.7">Nota Staff</Text>
      </Group>
      {isLong ? (
        <>
          <Collapse in={expanded}>
            <Text size="xs" c="dimmed">{note}</Text>
          </Collapse>
          {!expanded && <Text size="xs" c="dimmed" lineClamp={2}>{note}</Text>}
          <Button
            size="compact-xs" variant="subtle" color="blue" mt={4} p={0}
            rightSection={expanded ? <IconChevronUp size={10} /> : <IconChevronDown size={10} />}
            onClick={() => setExpanded(e => !e)}
            style={{ height: 'auto' }}
          >
            {expanded ? 'Meno' : 'Leggi tutto'}
          </Button>
        </>
      ) : (
        <Text size="xs" c="dimmed">{note}</Text>
      )}
    </Box>
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
      <Group justify="space-between" mb="md" align="center" wrap="nowrap">
        <Group gap="sm" align="center">
          <Avatar src={user?.photoURL} size="md" radius="xl" />
          <Stack gap={2}>
            <Title order={5} fw={700} lh={1}>{user?.displayName}</Title>
            <Badge
              size="xs"
              variant="light"
              color={isAdmin ? 'violet' : 'gray'}
              radius="sm"
              style={{ alignSelf: 'flex-start' }}
            >
              {isAdmin ? '✦ Admin' : 'Staff'}
            </Badge>
          </Stack>
        </Group>
        <Button size="xs" color="red" variant="subtle" rightSection={<IconArrowRight size={13} />} onClick={logout}>
          Esci
        </Button>
      </Group>

      {/* ── Tab switcher ───────────────────────── */}
      <Tabs value={view} onChange={v => setView(v ?? 'cards')} mb="md">
        <Tabs.List grow>
          <Tabs.Tab value="cards" leftSection={<IconLayoutGrid size={14} />}>Lista</Tabs.Tab>
          <Tabs.Tab value="calendar" leftSection={<IconCalendar size={14} />}>Calendario</Tabs.Tab>
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
                <Card shadow="sm" padding="md" radius="xl" withBorder h="100%" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                  {/* Row 1: Source badge + guest count */}
                  <Group justify="space-between" align="center" mb="xs">
                    {isAdmin ? (
                      <Badge color={SOURCE_COLORS[b.source]} variant="light" size="sm" radius="sm">
                        {SOURCE_LABELS[b.source]}
                      </Badge>
                    ) : (
                      <Badge color="gray" variant="light" size="sm" radius="sm">Prenotazione</Badge>
                    )}
                    <Group gap={4} align="center">
                      <IconUsers size={13} color="var(--mantine-color-dimmed)" />
                      <Text size="xs" c="dimmed" fw={500}>
                        {b.adults}{b.children > 0 ? ` + ${b.children}` : ''} {b.children > 0 ? 'ospiti' : b.adults === 1 ? 'adulto' : 'adulti'}
                      </Text>
                    </Group>
                  </Group>

                  {/* Row 2: Name / title */}
                  <Text fw={700} size="sm" mb="sm" truncate>
                    {isAdmin ? (b.guestName || 'Ospite') : 'Dettagli Prenotazione'}
                  </Text>

                  {/* Row 3: Check-in / Check-out side by side */}
                  <Group grow mb="sm" gap="xs">
                    <Paper
                      withBorder
                      p="xs"
                      radius="md"
                      style={{ borderColor: 'var(--mantine-color-green-3)', background: 'var(--mantine-color-green-light)' }}
                    >
                      <Group gap={5} mb={2}>
                        <ThemeIcon color="green" variant="transparent" size="xs">
                          <IconLogin size={11} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed" fw={500}>Check-in</Text>
                      </Group>
                      <Text fw={700} size="sm" c="green.7">
                        {dayjs(b.checkIn).format('ddd DD MMM')}
                      </Text>
                    </Paper>

                    <Paper
                      withBorder
                      p="xs"
                      radius="md"
                      style={{ borderColor: 'var(--mantine-color-red-3)', background: 'var(--mantine-color-red-light)' }}
                    >
                      <Group gap={5} mb={2}>
                        <ThemeIcon color="red" variant="transparent" size="xs">
                          <IconLogout size={11} />
                        </ThemeIcon>
                        <Text size="xs" c="dimmed" fw={500}>Check-out</Text>
                      </Group>
                      <Text fw={700} size="sm" c="red.7">
                        {dayjs(b.checkOut).format('ddd DD MMM')}
                      </Text>
                    </Paper>
                  </Group>

                  {/* Row 4: Staff note */}
                  {b.staffNote && <StaffNote note={b.staffNote} />}

                  {/* Row 5: CTA button */}
                  <Button
                    fullWidth
                    size="xs"
                    variant="light"
                    color="violet"
                    mt="md"
                    radius="md"
                    onClick={() => setSelectedBooking(b)}
                  >
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
                        <Box style={{ height: 3, flex: 1, maxWidth: 12, borderRadius: 2, background: 'var(--mantine-color-green-6)' }} />
                      )}
                      {isCheckOut && (
                        <Box style={{ height: 3, flex: 1, maxWidth: 12, borderRadius: 2, background: 'var(--mantine-color-red-6)' }} />
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
        radius="lg"
      >
        <Stack gap="sm">
          {dayBookings.map(b => {
            const isCheckIn = dayjs(selectedDay).isSame(dayjs(b.checkIn), 'day');
            const isCheckOut = dayjs(selectedDay).isSame(dayjs(b.checkOut), 'day');
            return (
              <Paper key={b.id} withBorder p="sm" radius="lg">
                {/* Source + check badges */}
                <Group justify="space-between" mb="xs">
                  {isAdmin ? (
                    <Badge color={SOURCE_COLORS[b.source]} variant="light" size="sm">{SOURCE_LABELS[b.source]}</Badge>
                  ) : (
                    <Badge color="gray" variant="light" size="sm">Prenotazione</Badge>
                  )}
                  <Group gap={4}>
                    {isCheckIn && <Badge color="green" variant="dot" size="sm">Check-in</Badge>}
                    {isCheckOut && <Badge color="red" variant="dot" size="sm">Check-out</Badge>}
                  </Group>
                </Group>

                {/* Name (admin only) */}
                {isAdmin && b.guestName && (
                  <Text size="sm" fw={700} mb="xs">{b.guestName}</Text>
                )}

                <Divider mb="xs" />

                {/* Dates + guest count */}
                <Group grow gap="xs" mb="xs">
                  <Box ta="center">
                    <Text size="xs" c="dimmed" fw={500}>Check-in</Text>
                    <Text size="sm" fw={700} c="green.7">{dayjs(b.checkIn).format('DD MMM')}</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="xs" c="dimmed" fw={500}>Check-out</Text>
                    <Text size="sm" fw={700} c="red.7">{dayjs(b.checkOut).format('DD MMM YYYY')}</Text>
                  </Box>
                  <Box ta="center">
                    <Text size="xs" c="dimmed" fw={500}>Ospiti</Text>
                    <Text size="sm" fw={700}>
                      {b.adults}{b.children > 0 ? `+${b.children}` : ''}
                    </Text>
                  </Box>
                </Group>

                {/* Staff note */}
                {b.staffNote && <StaffNote note={b.staffNote} />}

                <Button
                  fullWidth mt="sm" size="xs" variant="light" color="violet" radius="md"
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
