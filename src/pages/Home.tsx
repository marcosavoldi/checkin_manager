import { useEffect, useState } from 'react';
import { Title, Text, Card, Group, Stack, Grid, Paper, ThemeIcon, RingProgress } from '@mantine/core';
import { IconHome, IconCalendarCheck, IconCalendarStats, IconDoorExit } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { fetchUpcomingBookings, type Booking } from '../services/bookingService';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import weekday from 'dayjs/plugin/weekday';
import 'dayjs/locale/it';

dayjs.extend(isBetween);
dayjs.extend(weekday);
dayjs.locale('it');

export default function Home() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.appRole === 'admin';

  useEffect(() => {
    fetchUpcomingBookings().then(data => {
      setBookings(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <Text c="dimmed" ta="center" py="xl">Caricamento widget...</Text>;

  // --- LOGICA ADMIN: Occupazione ---
  const getOccupancy = (monthOffset: number) => {
    const targetMonth = dayjs().add(monthOffset, 'month');
    const startOfMonth = targetMonth.startOf('month');
    const totalDays = targetMonth.daysInMonth();
    
    let occupiedNights = 0;
    for (let i = 0; i < totalDays; i++) {
      const currentDay = startOfMonth.add(i, 'day');
      // Una notte è occupata se: checkIn <= currentDay < checkOut
      const isOccupied = bookings.some(b => {
        const inDate = dayjs(b.checkIn).startOf('day');
        const outDate = dayjs(b.checkOut).startOf('day');
        return (currentDay.isSame(inDate) || currentDay.isAfter(inDate)) && currentDay.isBefore(outDate);
      });
      if (isOccupied) occupiedNights++;
    }
    
    return { 
      occupied: occupiedNights, 
      total: totalDays, 
      label: targetMonth.format('MMMM'),
      percent: Math.round((occupiedNights / totalDays) * 100)
    };
  };

  const currentMonth = getOccupancy(0);
  const nextMonth = getOccupancy(1);

  // --- LOGICA STAFF: Checkout ---
  const today = dayjs().startOf('day');
  const nextCheckout = bookings
    .filter(b => dayjs(b.checkOut).isAfter(today) || dayjs(b.checkOut).isSame(today))
    .sort((a, b) => dayjs(a.checkOut).diff(dayjs(b.checkOut)))[0];

  // Settimana corrente (Lunedì - Domenica)
  const startOfThisWeek = dayjs().startOf('week'); // Locale 'it' -> Lunedì
  const endOfThisWeek = dayjs().endOf('week');
  
  // Settimana prossima (Lunedì - Domenica)
  const startOfNextWeek = startOfThisWeek.add(1, 'week');
  const endOfNextWeek = endOfThisWeek.add(1, 'week');

  const checkoutsThisWeek = bookings.filter(b => 
    dayjs(b.checkOut).isBetween(startOfThisWeek, endOfThisWeek, 'day', '[]')
  ).length;

  const checkoutsNextWeek = bookings.filter(b => 
    dayjs(b.checkOut).isBetween(startOfNextWeek, endOfNextWeek, 'day', '[]')
  ).length;

  return (
    <Stack gap="xl">
      <Group justify="space-between" align="flex-end">
        <div>
          <Title order={2} fw={800}>Benvenuto, {user?.displayName?.split(' ')[0]}</Title>
          <Text c="dimmed">Ecco una panoramica della tua attività.</Text>
        </div>
        <ThemeIcon size={48} radius="xl" variant="light" color="violet">
          <IconHome size={28} />
        </ThemeIcon>
      </Group>

      {isAdmin ? (
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder radius="lg" p="xl" shadow="sm">
              <Group justify="space-between" mb="lg">
                <div>
                  <Text size="sm" fw={700} c="dimmed" tt="uppercase">Occupazione {currentMonth.label}</Text>
                  <Title order={3}>{currentMonth.occupied} / {currentMonth.total} notti</Title>
                </div>
                <RingProgress
                  size={80}
                  thickness={8}
                  roundCaps
                  sections={[{ value: currentMonth.percent, color: 'violet' }]}
                  label={
                    <Text ta="center" size="xs" fw={700}>
                      {currentMonth.percent}%
                    </Text>
                  }
                />
              </Group>
              <ProgressStack occupied={currentMonth.occupied} total={currentMonth.total} />
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder radius="lg" p="xl" shadow="sm">
              <Group justify="space-between" mb="lg">
                <div>
                  <Text size="sm" fw={700} c="dimmed" tt="uppercase">Occupazione {nextMonth.label}</Text>
                  <Title order={3}>{nextMonth.occupied} / {nextMonth.total} notti</Title>
                </div>
                <RingProgress
                  size={80}
                  thickness={8}
                  roundCaps
                  sections={[{ value: nextMonth.percent, color: 'blue' }]}
                  label={
                    <Text ta="center" size="xs" fw={700}>
                      {nextMonth.percent}%
                    </Text>
                  }
                />
              </Group>
              <ProgressStack occupied={nextMonth.occupied} total={nextMonth.total} color="blue" />
            </Card>
          </Grid.Col>
        </Grid>
      ) : (
        <Grid>
          {/* Prossimo Checkout */}
          <Grid.Col span={12}>
            <Card withBorder radius="lg" p="xl" shadow="sm" style={{ background: 'var(--mantine-color-violet-light)' }}>
              <Group gap="xl" wrap="nowrap">
                <ThemeIcon size={56} radius="md" color="violet" variant="filled">
                  <IconDoorExit size={32} />
                </ThemeIcon>
                <div>
                  <Text size="xs" fw={700} tt="uppercase" c="violet.9">Prossimo Check-out</Text>
                  {nextCheckout ? (
                    <>
                      <Title order={2}>{dayjs(nextCheckout.checkOut).format('dddd D MMMM')}</Title>
                      <Text size="sm" c="violet.8">Ospite: {nextCheckout.guestName || 'Riservato'}</Text>
                    </>
                  ) : (
                    <Title order={4}>Nessun check-out imminente</Title>
                  )}
                </div>
              </Group>
            </Card>
          </Grid.Col>

          {/* Checkout Settimanali */}
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Paper withBorder radius="lg" p="lg" shadow="xs">
              <Group wrap="nowrap">
                <ThemeIcon size="lg" radius="md" variant="light" color="blue">
                  <IconCalendarCheck size={20} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">Questa settimana</Text>
                  <Title order={4}>{checkoutsThisWeek} Checkout</Title>
                  <Text size="xs" c="dimmed">Lun {startOfThisWeek.format('DD')} - Dom {endOfThisWeek.format('DD')}</Text>
                </div>
              </Group>
            </Paper>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Paper withBorder radius="lg" p="lg" shadow="xs">
              <Group wrap="nowrap">
                <ThemeIcon size="lg" radius="md" variant="light" color="teal">
                  <IconCalendarStats size={20} />
                </ThemeIcon>
                <div>
                  <Text size="xs" c="dimmed" fw={700} tt="uppercase">Prossima settimana</Text>
                  <Title order={4}>{checkoutsNextWeek} Checkout</Title>
                  <Text size="xs" c="dimmed">Lun {startOfNextWeek.format('DD')} - Dom {endOfNextWeek.format('DD')}</Text>
                </div>
              </Group>
            </Paper>
          </Grid.Col>
        </Grid>
      )}
    </Stack>
  );
}

function ProgressStack({ occupied, total, color = "violet" }: { occupied: number, total: number, color?: string }) {
  return (
    <Stack gap={4} mt="md">
      <Group justify="space-between">
        <Text size="xs" c="dimmed">Notti disponibili</Text>
        <Text size="xs" fw={700}>{total - occupied} notti</Text>
      </Group>
      <div style={{ height: 6, background: 'var(--mantine-color-gray-2)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ 
          height: '100%', 
          width: `${(occupied / total) * 100}%`, 
          background: `var(--mantine-color-${color}-6)` 
        }} />
      </div>
    </Stack>
  );
}
