import { useEffect, useState } from 'react';
import { Title, Text, Card, Group, Stack, Grid, Paper, ThemeIcon, SimpleGrid, Badge, Button, Box, useComputedColorScheme, Accordion } from '@mantine/core';
import { IconLogin, IconLogout, IconBed, IconBath, IconAlertCircle, IconArrowRight, IconLayoutGrid } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchUpcomingBookings, processLinenConsumption, type Booking } from '../services/bookingService';
import { getLinenInventory, subtractLinen, type LinenInventory } from '../services/inventoryService';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import weekday from 'dayjs/plugin/weekday';
import 'dayjs/locale/it';

dayjs.extend(isBetween);
dayjs.extend(weekday);
dayjs.locale('it');

export default function Home() {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const glassStyles = {
    background: computedColorScheme === 'dark' ? 'rgba(36, 36, 36, 0.4)' : 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    border: computedColorScheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.3)',
  };
  const { user } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState<LinenInventory | null>(null);

  const isAdmin = user?.appRole === 'admin';

  const loadAll = async () => {
    setLoading(true);
    try {
      let bkngs: Booking[] = [];
      let inv: LinenInventory | null = null;
      
      try {
        bkngs = await fetchUpcomingBookings();
      } catch (err) {
        console.error('Fetch bookings failed:', err);
      }

      try {
        inv = await getLinenInventory();
      } catch (err) {
        console.warn('Inventory fetch failed (check firestore rules):', err);
      }
      
      // Sincronizza consumi se admin
      if (bkngs.length > 0 && inv) {
        await processLinenConsumption(bkngs, subtractLinen);
        // Ricarica inventario se cambiato
        try {
          const updatedInv = await getLinenInventory();
          setInventory(updatedInv);
        } catch (err) {
          setInventory(inv);
        }
      } else {
        setInventory(inv);
      }
      
      setBookings(bkngs);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAll(); }, []);

  if (loading) return <Text c="dimmed" ta="center" py="xl">Caricamento widget...</Text>;

  // --- LOGICA DATE ---
  const today = dayjs().startOf('day');

  // --- LOGICA ADMIN: Occupazione ---
  const getOccupancy = (monthOffset: number) => {
    const targetMonth = dayjs().add(monthOffset, 'month');
    const startOfMonth = targetMonth.startOf('month');
    const totalDays = targetMonth.daysInMonth();
    
    let occupiedNights = 0;
    for (let i = 0; i < totalDays; i++) {
       const currentDay = startOfMonth.add(i, 'day');
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
  const followingMonth = getOccupancy(2);

  // --- LOGICA PROSSIMI EVENTI (Admin & Staff) ---
  const tomorrow = dayjs().add(1, 'day').startOf('day');
  const upcomingActivityCount = bookings.filter(b => 
    (dayjs(b.checkIn).isSame(tomorrow, 'day') || dayjs(b.checkIn).isAfter(tomorrow, 'day')) &&
    (dayjs(b.checkIn).isBefore(tomorrow.add(7, 'day'), 'day') || 
     dayjs(b.checkOut).isAfter(tomorrow, 'day') && dayjs(b.checkOut).isBefore(tomorrow.add(7, 'day'), 'day'))
  ).length;

  const nextCheckout = bookings
    .filter(b => dayjs(b.checkOut).isAfter(today) || dayjs(b.checkOut).isSame(today))
    .sort((a, b) => dayjs(a.checkOut).diff(dayjs(b.checkOut)))[0];

  const nextCheckin = bookings
    .filter(b => dayjs(b.checkIn).isAfter(today) || dayjs(b.checkIn).isSame(today))
    .sort((a, b) => dayjs(a.checkIn).diff(dayjs(b.checkIn)))[0];

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="center">
        <div>
          <Title order={2} fw={800} c="var(--mantine-color-text)">Benvenuto, {user?.displayName?.split(' ')[0]}</Title>
          <Text c="dimmed">Panoramica attività Lazzaretto City Walk</Text>
        </div>
      </Group>

      {isAdmin ? (
        <Stack gap="md">
          <Accordion variant="separated" radius="24px" multiple={true} defaultValue={[]} styles={{
            item: { border: glassStyles.border, background: glassStyles.background, backdropFilter: glassStyles.backdropFilter, marginBottom: '12px', borderRadius: '24px' },
            control: { padding: '20px 24px' },
            content: { padding: '0 24px 24px 24px' }
          }}>
            {/* 1. Occupazione Trimestrale */}
            <Accordion.Item value="occupazione">
              <Accordion.Control>
                <Stack gap={2}>
                  <Text size="xs" fw={800} tt="uppercase" c="indigo.7" lts="1.5px">Statistiche</Text>
                  <Title order={4} fw={900}>Occupazione Trimestrale</Title>
                  <Text size="xs" c="dimmed" fw={600}>
                    {currentMonth.label}, {nextMonth.label} e {followingMonth.label}
                  </Text>
                </Stack>
              </Accordion.Control>
              <Accordion.Panel>
                <Grid gutter="md">
                  {[currentMonth, nextMonth, followingMonth].map((m, idx) => (
                    <Grid.Col span={{ base: 12, md: 4 }} key={idx}>
                      <Paper withBorder p="md" radius="xl" style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <Group justify="space-between" wrap="nowrap" mb="xs">
                          <Text size="xs" fw={800} tt="uppercase" c="dimmed">{m.label}</Text>
                          <Badge size="xs" variant="light" color={idx === 0 ? 'indigo' : 'blue'}>{m.percent}%</Badge>
                        </Group>
                        <Title order={4} mb={4}>{m.occupied} / {m.total} notti</Title>
                        <ProgressStack occupied={m.occupied} total={m.total} color={idx === 0 ? 'indigo' : 'blue'} />
                      </Paper>
                    </Grid.Col>
                  ))}
                </Grid>
              </Accordion.Panel>
            </Accordion.Item>

            {/* 2. Inventario Biancheria */}
            {inventory && (
              <Accordion.Item value="biancheria">
                <Accordion.Control>
                  <Stack gap={2}>
                    <Text size="xs" fw={800} tt="uppercase" c="teal.7" lts="1.5px">Operativo</Text>
                    <Group gap="xs">
                      <Title order={4} fw={900}>Inventario Biancheria</Title>
                      {(inventory.bedKits === 0 && inventory.towelKits === 0) && (
                        <Badge color="orange" size="xs">Richiesto</Badge>
                      )}
                    </Group>
                  </Stack>
                </Accordion.Control>
                <Accordion.Panel>
                  {(inventory.bedKits === 0 && inventory.towelKits === 0) ? (
                    <Stack align="center" py="sm" gap="xs">
                      <Text size="sm" ta="center" c="dimmed">Benvenuto! Imposta disponibilità iniziale di kit puliti.</Text>
                      <Button variant="light" color="indigo" size="xs" radius="xl" onClick={() => navigate('/biancheria')}>
                        Configura ora
                      </Button>
                    </Stack>
                  ) : (
                    <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                      <Paper withBorder p="md" radius="xl" style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <Group gap="md">
                          <ThemeIcon size="md" radius="xl" color="indigo" variant="light"><IconBed size={18} /></ThemeIcon>
                          <div>
                            <Text size="xs" c="dimmed" fw={700}>KIT LETTO</Text>
                            <Title order={3}>{inventory.bedKits}</Title>
                          </div>
                        </Group>
                      </Paper>
                      <Paper withBorder p="md" radius="xl" style={{ background: 'rgba(0,0,0,0.02)' }}>
                        <Group gap="md">
                          <ThemeIcon size="md" radius="xl" color="teal" variant="light"><IconBath size={18} /></ThemeIcon>
                          <div>
                            <Text size="xs" c="dimmed" fw={700}>KIT ASCIUGAMANI</Text>
                            <Title order={3}>{inventory.towelKits}</Title>
                          </div>
                        </Group>
                      </Paper>
                    </SimpleGrid>
                  )}
                </Accordion.Panel>
              </Accordion.Item>
            )}

            {/* 3. Agenda Settimanale (la stessa usata dallo staff) */}
            <Accordion.Item value="agenda">
              <Accordion.Control>
                <Stack gap={2}>
                  <Text size="xs" fw={800} tt="uppercase" c="indigo.7" lts="1.5px">Pianificazione</Text>
                  <Group gap="xs">
                    <Title order={4} fw={900}>Agenda Settimanale</Title>
                    {upcomingActivityCount > 0 && (
                      <Badge color="indigo" variant="light" size="sm">{upcomingActivityCount} attività</Badge>
                    )}
                  </Group>
                </Stack>
              </Accordion.Control>
              <Accordion.Panel>
                <AgendaPanel bookings={bookings} />
              </Accordion.Panel>
            </Accordion.Item>
          </Accordion>
        </Stack>
      ) : (
        <Stack gap="lg">
          {/* 1. Prossimo Check-out */}
          <Card 
            withBorder 
            radius="24px" 
            p="xl" 
            shadow="xl" 
            style={{ 
              ...glassStyles,
              background: computedColorScheme === 'dark' 
                ? 'linear-gradient(135deg, rgba(234, 56, 56, 0.1) 0%, rgba(36, 36, 36, 0.6) 100%)' 
                : 'linear-gradient(135deg, rgba(250, 82, 82, 0.05) 0%, rgba(255, 255, 255, 0.9) 100%)',
              borderColor: 'var(--mantine-color-red-light)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <Stack gap="md">
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={4}>
                  <Text size="xs" fw={800} tt="uppercase" c="red.6" lts="1.5px">Prossimo Check-out</Text>
                  {nextCheckout ? (
                    <Title order={3} fw={900}>
                      {dayjs(nextCheckout.checkOut).format('dddd D MMMM')}
                    </Title>
                  ) : (
                    <Text fw={700}>Nessuna uscita prevista</Text>
                  )}
                </Stack>
                <ThemeIcon size={52} radius="xl" color="red.6" variant="light" style={{ background: 'var(--mantine-color-red-light)' }}>
                  <IconLogout size={28} />
                </ThemeIcon>
              </Group>
              
              {nextCheckout && (nextCheckout.staffNoteCheckOut || nextCheckout.staffNoteBooking) && (
                <Stack gap={8} mt="xs">
                  {nextCheckout.staffNoteCheckOut && (
                    <Box p="sm" style={{ background: 'var(--mantine-color-red-light)', borderRadius: 16, border: '1px solid var(--mantine-color-red-1)' }}>
                      <Group gap={6} mb={4}>
                        <IconAlertCircle size={14} color="var(--mantine-color-red-7)" />
                        <Text size="xs" fw={900} tt="uppercase" c="red.8">Nota Check-out</Text>
                      </Group>
                      <Text size="sm" fw={700} c="red.9">{nextCheckout.staffNoteCheckOut}</Text>
                    </Box>
                  )}
                  {nextCheckout.staffNoteBooking && (
                    <Box p="sm" style={{ background: 'var(--mantine-color-gray-1)', borderRadius: 16, border: '1px solid var(--mantine-color-gray-2)' }}>
                      <Group gap={6} mb={4}>
                        <IconAlertCircle size={14} color="gray" />
                        <Text size="xs" fw={900} tt="uppercase" c="dimmed">Nota Prenotazione</Text>
                      </Group>
                      <Text size="sm" fw={700}>{nextCheckout.staffNoteBooking}</Text>
                    </Box>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>

          {/* 1b. Prossimo Check-in */}
          <Card 
            withBorder 
            radius="24px" 
            p="xl" 
            shadow="xl" 
            style={{ 
              ...glassStyles,
              background: computedColorScheme === 'dark' 
                ? 'linear-gradient(135deg, rgba(64, 192, 87, 0.1) 0%, rgba(36, 36, 36, 0.6) 100%)' 
                : 'linear-gradient(135deg, rgba(64, 192, 87, 0.05) 0%, rgba(255, 255, 255, 0.9) 100%)',
              borderColor: 'var(--mantine-color-green-light)',
              overflow: 'hidden',
              position: 'relative'
            }}
          >
            <Stack gap="md">
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={4}>
                  <Text size="xs" fw={800} tt="uppercase" c="green.7" lts="1.5px">Prossimo Check-in</Text>
                  {nextCheckin ? (
                    <Stack gap={4}>
                      <Title order={3} fw={900}>
                        {dayjs(nextCheckin.checkIn).format('dddd D MMMM')}
                      </Title>
                      <Group gap={6}>
                        <Badge variant="dot" color="green.7" size="sm" radius="sm">
                          {nextCheckin.adults} {nextCheckin.adults === 1 ? 'Adulto' : 'Adulti'}
                          {nextCheckin.children > 0 && ` + ${nextCheckin.children} ${nextCheckin.children === 1 ? 'Bambino' : 'Bambini'}`}
                        </Badge>
                      </Group>
                    </Stack>
                  ) : (
                    <Text fw={700}>Nessun arrivo previsto</Text>
                  )}
                </Stack>
                <ThemeIcon size={52} radius="xl" color="green.7" variant="light" style={{ background: 'var(--mantine-color-green-light)' }}>
                  <IconLogin size={28} />
                </ThemeIcon>
              </Group>

              {nextCheckin && (nextCheckin.staffNoteCheckIn || nextCheckin.staffNoteBooking) && (
                <Stack gap={8} mt="xs">
                  {nextCheckin.staffNoteCheckIn && (
                    <Box p="sm" style={{ background: 'var(--mantine-color-green-light)', borderRadius: 16, border: '1px solid var(--mantine-color-green-1)' }}>
                      <Group gap={6} mb={4}>
                        <IconAlertCircle size={14} color="var(--mantine-color-green-8)" />
                        <Text size="xs" fw={900} tt="uppercase" c="green.9">Nota Check-in</Text>
                      </Group>
                      <Text size="sm" fw={700} c="green.9">{nextCheckin.staffNoteCheckIn}</Text>
                    </Box>
                  )}
                  {nextCheckin.staffNoteBooking && (
                    <Box p="sm" style={{ background: 'var(--mantine-color-gray-1)', borderRadius: 16, border: '1px solid var(--mantine-color-gray-2)' }}>
                      <Group gap={6} mb={4}>
                        <IconAlertCircle size={14} color="gray" />
                        <Text size="xs" fw={900} tt="uppercase" c="dimmed">Nota Prenotazione</Text>
                      </Group>
                      <Text size="sm" fw={700}>{nextCheckin.staffNoteBooking}</Text>
                    </Box>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>

          {/* Agenda Settimanale (Accordion) */}
          <Card 
            withBorder 
            radius="24px" 
            p={0} 
            shadow="lg"
            style={{
              ...glassStyles,
              background: computedColorScheme === 'dark' 
                ? 'rgba(36, 36, 36, 0.4)' 
                : 'rgba(255, 255, 255, 0.6)',
              overflow: 'hidden'
            }}
          >
            <Accordion variant="separated" radius="24px" defaultValue="" styles={{
              item: { border: 'none', background: 'transparent' },
              control: { padding: '20px 24px' },
              content: { padding: '0 16px 20px 16px' }
            }}>
              <Accordion.Item value="agenda-settimanale">
                <Accordion.Control>
                  <Stack gap={2}>
                    <Text size="xs" fw={800} tt="uppercase" c="indigo.7" lts="1.5px">Pianificazione</Text>
                    <Group gap="xs">
                      <Title order={4} fw={900}>Agenda Settimanale</Title>
                      {upcomingActivityCount > 0 && (
                        <Badge color="indigo" variant="light" size="sm">{upcomingActivityCount} attività</Badge>
                      )}
                    </Group>
                    <Text size="xs" c="dimmed" fw={600}>
                      Prossimi 7 giorni ({dayjs().add(1, 'day').format('D MMM')} — {dayjs().add(7, 'day').format('D MMM')})
                    </Text>
                  </Stack>
                </Accordion.Control>
                <Accordion.Panel>
                  <AgendaPanel bookings={bookings} />
                </Accordion.Panel>
              </Accordion.Item>
            </Accordion>
          </Card>

          <Button 
            onClick={() => navigate('/prenotazioni')}
            fullWidth 
            size="lg" 
            radius="24px" 
            color="indigo"
            variant="gradient"
            gradient={{ from: 'indigo.5', to: 'indigo.7', deg: 45 }}
            leftSection={<IconLayoutGrid size={20} />}
            rightSection={<IconArrowRight size={18} />}
            style={{ 
              boxShadow: '0 8px 24px rgba(79, 86, 201, 0.2)',
              height: 60
            }}
          >
            Gestione Prenotazioni
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

function ProgressStack({ occupied, total, color = "indigo" }: { occupied: number, total: number, color?: string }) {
  return (
    <Stack gap={2} mt="xs">
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <Text size="10px" c="dimmed">Libere: {total - occupied}</Text>
      </div>
      <div style={{ height: 4, background: 'var(--mantine-color-gray-2)', borderRadius: 2, overflow: 'hidden', width: '100px' }}>
        <div style={{ 
          height: '100%', 
          width: `${(occupied / total) * 100}%`, 
          background: `var(--mantine-color-${color}-6)` 
        }} />
      </div>
    </Stack>
  );
}

function AgendaPanel({ bookings }: { bookings: Booking[] }) {
  return (
    <Stack gap={6}>
      {Array.from({ length: 7 }).map((_, i) => {
        const dayDate = dayjs().add(i + 1, 'day').startOf('day');
        const checkIn = bookings.find(b => dayjs(b.checkIn).isSame(dayDate, 'day'));
        const checkOut = bookings.find(b => dayjs(b.checkOut).isSame(dayDate, 'day'));

        return (
          <Paper
            key={i}
            withBorder
            p="sm"
            radius="xl"
            style={{
              background: (checkIn || checkOut) ? 'rgba(121, 80, 242, 0.05)' : 'rgba(255,255,255,0.02)',
              borderColor: (checkIn || checkOut) ? 'var(--mantine-color-indigo-light)' : 'rgba(0,0,0,0.03)'
            }}
          >
            <Group justify="space-between" wrap="nowrap">
              <Stack gap={0} style={{ width: 70 }}>
                <Text size="9px" fw={800} tt="uppercase" c="dimmed" lh={1.1}>
                  {dayDate.format('ddd')}
                </Text>
                <Text size="sm" fw={900}>
                  {dayDate.format('D MMM')}
                </Text>
              </Stack>

              <Group gap="xs" style={{ flex: 1, justifyContent: 'flex-end' }}>
                {checkOut && (
                  <Badge color="red" variant="light" size="xs" radius="sm" leftSection={<IconLogout size={10} />}>
                    Check-out
                  </Badge>
                )}
                {checkIn && (
                  <Badge color="green" variant="light" size="xs" radius="sm" leftSection={<IconLogin size={10} />}>
                    Check-in
                  </Badge>
                )}
                {!checkIn && !checkOut && (
                  <Text size="xs" c="dimmed" fs="italic">Libero</Text>
                )}
              </Group>
            </Group>
          </Paper>
        );
      })}
    </Stack>
  );
}
