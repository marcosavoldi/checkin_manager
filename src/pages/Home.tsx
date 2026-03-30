import { useEffect, useState } from 'react';
import { Title, Text, Card, Group, Stack, Grid, Paper, ThemeIcon, RingProgress, Divider, SimpleGrid, Badge, Button, Box, useComputedColorScheme } from '@mantine/core';
import { IconLogin, IconLogout, IconBed, IconBath, IconAlertCircle, IconArrowRight } from '@tabler/icons-react';
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
  const startOfThisWeek = dayjs().startOf('week'); // Locale 'it' -> Lunedì
  const endOfThisWeek = dayjs().endOf('week');

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

  // --- LOGICA PROSSIMI EVENTI (Admin & Staff) ---
  const nextCheckout = bookings
    .filter(b => dayjs(b.checkOut).isAfter(today) || dayjs(b.checkOut).isSame(today))
    .sort((a, b) => dayjs(a.checkOut).diff(dayjs(b.checkOut)))[0];

  const nextCheckin = bookings
    .filter(b => dayjs(b.checkIn).isAfter(today) || dayjs(b.checkIn).isSame(today))
    .sort((a, b) => dayjs(a.checkIn).diff(dayjs(b.checkIn)))[0];

  const checkinsThisWeek = bookings.filter(b => 
    dayjs(b.checkIn).isBetween(startOfThisWeek, endOfThisWeek, 'day', '[]')
  ).length;

  const checkoutsThisWeek = bookings.filter(b => 
    dayjs(b.checkOut).isBetween(startOfThisWeek, endOfThisWeek, 'day', '[]')
  ).length;

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
           <Grid gutter="md">
             {/* Occupazione Mese Corrente */}
             <Grid.Col span={{ base: 12, md: 6 }}>
                <Card 
                  withBorder 
                  radius="xl" 
                  p="lg" 
                  shadow="md"
                  style={glassStyles}
                >
                 <Group justify="space-between" wrap="nowrap">
                   <div>
                     <Text size="xs" fw={800} c="dimmed" tt="uppercase" lts="1px">Occupazione {currentMonth.label}</Text>
                     <Title order={4} mb={4}>{currentMonth.occupied} / {currentMonth.total} notti</Title>
                     <ProgressStack occupied={currentMonth.occupied} total={currentMonth.total} />
                   </div>
                   <RingProgress
                     size={65}
                     thickness={6}
                     roundCaps
                     sections={[{ value: currentMonth.percent, color: 'violet' }]}
                     label={<Text ta="center" size="xs" fw={700}>{currentMonth.percent}%</Text>}
                   />
                 </Group>
               </Card>
             </Grid.Col>

             {/* Occupazione Mese Prossimo */}
             <Grid.Col span={{ base: 12, md: 6 }}>
                <Card 
                  withBorder 
                  radius="xl" 
                  p="lg" 
                  shadow="md"
                  style={glassStyles}
                >
                 <Group justify="space-between" wrap="nowrap">
                   <div>
                     <Text size="xs" fw={800} c="dimmed" tt="uppercase" lts="1px">Occupazione {nextMonth.label}</Text>
                     <Title order={4} mb={4}>{nextMonth.occupied} / {nextMonth.total} notti</Title>
                     <ProgressStack occupied={nextMonth.occupied} total={nextMonth.total} color="blue" />
                   </div>
                   <RingProgress
                     size={65}
                     thickness={6}
                     roundCaps
                     sections={[{ value: nextMonth.percent, color: 'blue' }]}
                     label={<Text ta="center" size="xs" fw={700}>{nextMonth.percent}%</Text>}
                   />
                 </Group>
               </Card>
             </Grid.Col>
           </Grid>

            <Divider label="Tracker Settimanale Admin" labelPosition="center" color="gray.2" />

            {inventory && (
              <Paper 
                withBorder 
                radius="xl" 
                p="lg" 
                shadow="md"
                style={glassStyles}
              >
                <Group justify="space-between" mb="md">
                  <Text size="xs" fw={800} c="dimmed" tt="uppercase" lts="1px">Inventario Biancheria Pulita</Text>
                  {(inventory.bedKits === 0 && inventory.towelKits === 0) && (
                    <Badge color="orange" variant="light" leftSection={<IconAlertCircle size={10} />}>Configurazione richiesta</Badge>
                  )}
                </Group>
                {(inventory.bedKits === 0 && inventory.towelKits === 0) ? (
                  <Stack align="center" py="sm" gap="xs">
                    <Text size="sm" ta="center" c="dimmed">Benvenuto! Imposta la tua disponibilità iniziale di kit puliti.</Text>
                    <Button 
                      variant="light" 
                      color="indigo" 
                      size="xs" 
                      radius="xl"
                      rightSection={<IconArrowRight size={14} />}
                      onClick={() => navigate('/biancheria')}
                    >
                      Configura ora
                    </Button>
                  </Stack>
                ) : (
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
                    <Group gap="md" align="center" wrap="nowrap">
                      <ThemeIcon size={48} radius="xl" color="indigo" variant="light">
                        <IconBed size={26} />
                      </ThemeIcon>
                      <div style={{ flex: 1 }}>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase" lts="0.5px">Kit Letto</Text>
                        <Title order={2} c={inventory.bedKits < 0 ? 'red.6' : 'indigo.9'} style={{ lineHeight: 1 }}>
                          {inventory.bedKits}
                        </Title>
                      </div>
                    </Group>
                    <Group gap="md" align="center" wrap="nowrap">
                      <ThemeIcon size={48} radius="xl" color="teal" variant="light">
                        <IconBath size={26} />
                      </ThemeIcon>
                      <div style={{ flex: 1 }}>
                        <Text size="xs" c="dimmed" fw={700} tt="uppercase" lts="0.5px">Kit Asciugamani</Text>
                        <Title order={2} c={inventory.towelKits < 0 ? 'red.6' : 'teal.9'} style={{ lineHeight: 1 }}>
                          {inventory.towelKits}
                        </Title>
                      </div>
                    </Group>
                  </SimpleGrid>
                )}

                
                <Text size="10px" c="dimmed" mt="md" ta="right" fw={500}>
                  Aggiornato: {dayjs(inventory.lastUpdated?.toDate ? inventory.lastUpdated.toDate() : inventory.lastUpdated).format('HH:mm [del] DD MMM')}
                </Text>
              </Paper>
            )}

           <Grid gutter="md">
             {/* Prossimi Eventi Admin */}
             <Grid.Col span={{ base: 12, sm: 6 }}>
                <Paper 
                  withBorder 
                  radius="xl" 
                  p="md" 
                  shadow="md"
                  style={glassStyles}
                >
                 <Group wrap="nowrap">
                   <ThemeIcon size="lg" radius="xl" variant="light" color="green">
                     <IconLogin size={20} />
                   </ThemeIcon>
                   <div style={{ flex: 1 }}>
                     <Text size="xs" c="dimmed" fw={800} tt="uppercase" lts="1px">Prossimo Check-in</Text>
                     <Text size="sm" fw={800} truncate>
                       {nextCheckin ? dayjs(nextCheckin.checkIn).format('ddd D MMM') : 'Nessuno'}
                     </Text>
                     <Text size="xs" c="dimmed" fw={500}>{checkinsThisWeek} previsti questa sett.</Text>
                   </div>
                 </Group>
               </Paper>
             </Grid.Col>

             <Grid.Col span={{ base: 12, sm: 6 }}>
                <Paper 
                  withBorder 
                  radius="xl" 
                  p="md" 
                  shadow="md"
                  style={glassStyles}
                >
                 <Group wrap="nowrap">
                   <ThemeIcon size="lg" radius="xl" variant="light" color="red">
                     <IconLogout size={20} />
                   </ThemeIcon>
                   <div style={{ flex: 1 }}>
                     <Text size="xs" c="dimmed" fw={800} tt="uppercase" lts="1px">Prossimo Check-out</Text>
                     <Text size="sm" fw={800} truncate>
                       {nextCheckout ? dayjs(nextCheckout.checkOut).format('ddd D MMM') : 'Nessuno'}
                     </Text>
                     <Text size="xs" c="dimmed" fw={500}>{checkoutsThisWeek} previsti questa sett.</Text>
                   </div>
                 </Group>
               </Paper>
             </Grid.Col>
           </Grid>
        </Stack>
      ) : (
        <Stack gap="md">
          {/* 1. Prossimo Check-out (Priorità massima) */}
          <Card 
            withBorder 
            radius="xl" 
            p="md" 
            shadow="md" 
            style={{ 
              background: 'linear-gradient(135deg, var(--mantine-color-red-6) 0%, var(--mantine-color-red-8) 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            <Stack gap="xs">
              <Group gap="md" wrap="nowrap">
                <ThemeIcon size={44} radius="lg" color="rgba(255,255,255,0.2)" variant="filled">
                  <IconLogout size={24} color="white" />
                </ThemeIcon>
                <div>
                  <Text size="xs" fw={700} tt="uppercase" style={{ color: 'rgba(255,255,255,0.7)', lts: '1px' }}>Prossimo Check-out</Text>
                  {nextCheckout ? (
                    <Text fw={900} size="lg" lh={1.2}>
                      {dayjs(nextCheckout.checkOut).format('dddd D MMMM')}
                    </Text>
                  ) : (
                    <Text fw={700}>Nessuna uscita prevista</Text>
                  )}
                </div>
              </Group>
              
              {nextCheckout && (nextCheckout.staffNoteCheckOut || nextCheckout.staffNoteBooking) && (
                <Stack gap={6}>
                  {nextCheckout.staffNoteCheckOut && (
                    <Box p="xs" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)' }}>
                      <Group gap={5} mb={2}>
                        <IconAlertCircle size={14} color="white" />
                        <Text size="xs" fw={800} tt="uppercase" style={{ color: 'white' }}>Nota Check-out</Text>
                      </Group>
                      <Text size="sm" fw={600} style={{ color: 'white' }}>{nextCheckout.staffNoteCheckOut}</Text>
                    </Box>
                  )}
                  {nextCheckout.staffNoteBooking && (
                    <Box p="xs" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)' }}>
                      <Group gap={5} mb={2}>
                        <IconAlertCircle size={14} color="white" />
                        <Text size="xs" fw={800} tt="uppercase" style={{ color: 'white' }}>Nota Prenotazione</Text>
                      </Group>
                      <Text size="sm" fw={600} style={{ color: 'white' }}>{nextCheckout.staffNoteBooking}</Text>
                    </Box>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>

          {/* 1b. Prossimo Check-in */}
          <Card 
            withBorder 
            radius="xl" 
            p="md" 
            shadow="md" 
            style={{ 
              background: 'linear-gradient(135deg, var(--mantine-color-green-6) 0%, var(--mantine-color-green-8) 100%)',
              color: 'white',
              border: 'none'
            }}
          >
            <Stack gap="xs">
              <Group gap="md" wrap="nowrap">
                <ThemeIcon size={44} radius="lg" color="rgba(255,255,255,0.2)" variant="filled">
                  <IconLogin size={24} color="white" />
                </ThemeIcon>
                <div>
                  <Text size="xs" fw={700} tt="uppercase" style={{ color: 'rgba(255,255,255,0.7)', lts: '1px' }}>Prossimo Check-in</Text>
                  {nextCheckin ? (
                    <Text fw={900} size="lg" lh={1.2}>
                      {dayjs(nextCheckin.checkIn).format('dddd D MMMM')}
                    </Text>
                  ) : (
                    <Text fw={700}>Nessun arrivo previsto</Text>
                  )}
                </div>
              </Group>

              {nextCheckin && (nextCheckin.staffNoteCheckIn || nextCheckin.staffNoteBooking) && (
                <Stack gap={6}>
                  {nextCheckin.staffNoteCheckIn && (
                    <Box p="xs" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)' }}>
                      <Group gap={5} mb={2}>
                        <IconAlertCircle size={14} color="white" />
                        <Text size="xs" fw={800} tt="uppercase" style={{ color: 'white' }}>Nota Check-in</Text>
                      </Group>
                      <Text size="sm" fw={600} style={{ color: 'white' }}>{nextCheckin.staffNoteCheckIn}</Text>
                    </Box>
                  )}
                  {nextCheckin.staffNoteBooking && (
                    <Box p="xs" style={{ background: 'rgba(0,0,0,0.15)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)' }}>
                      <Group gap={5} mb={2}>
                        <IconAlertCircle size={14} color="white" />
                        <Text size="xs" fw={800} tt="uppercase" style={{ color: 'white' }}>Nota Prenotazione</Text>
                      </Group>
                      <Text size="sm" fw={600} style={{ color: 'white' }}>{nextCheckin.staffNoteBooking}</Text>
                    </Box>
                  )}
                </Stack>
              )}
            </Stack>
          </Card>

          {/* 2. Panoramica 7 Giorni (Layout Riparato) */}
          <Card 
            withBorder 
            radius="xl" 
            p="lg" 
            shadow="xl"
            style={{
              ...glassStyles,
              background: computedColorScheme === 'dark' 
                ? 'rgba(36, 36, 36, 0.6)' 
                : 'rgba(255, 255, 255, 0.8)',
              overflow: 'hidden'
            }}
          >
            <Stack gap="md">
              <Stack gap={2}>
                <Text size="xs" fw={800} tt="uppercase" c="violet.7" lts="1px">I Prossimi 7 giorni</Text>
                <Title order={4} fw={900}>Panoramica Attività</Title>
                <Text size="xs" c="dimmed" fw={600}>
                  {today.format('D MMM')} — {today.add(7, 'day').format('D MMM')}
                </Text>
              </Stack>

              <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="sm">
                <Paper withBorder radius="lg" p="sm" style={{ background: 'var(--mantine-color-green-light)', borderColor: 'var(--mantine-color-green-2)' }}>
                  <Group wrap="nowrap" gap="sm">
                    <ThemeIcon size={34} radius="md" color="green" variant="filled">
                      <IconLogin size={18} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="green.9" fw={700} tt="uppercase">Check-in</Text>
                      <Text fw={900} size="lg" lh={1} c="green.9">
                        {bookings.filter(b => dayjs(b.checkIn).isBetween(today, today.add(7, 'day'), 'day', '[]')).length}
                      </Text>
                    </div>
                  </Group>
                </Paper>

                <Paper withBorder radius="lg" p="sm" style={{ background: 'var(--mantine-color-red-light)', borderColor: 'var(--mantine-color-red-2)' }}>
                  <Group wrap="nowrap" gap="sm">
                    <ThemeIcon size={34} radius="md" color="red" variant="filled">
                      <IconLogout size={18} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" c="red.9" fw={700} tt="uppercase">Check-out</Text>
                      <Text fw={900} size="lg" lh={1} c="red.9">
                        {bookings.filter(b => dayjs(b.checkOut).isBetween(today, today.add(7, 'day'), 'day', '[]')).length}
                      </Text>
                    </div>
                  </Group>
                </Paper>
              </SimpleGrid>

              <Button 
                onClick={() => navigate('/prenotazioni')}
                fullWidth 
                size="sm" 
                radius="md" 
                color="violet"
                variant="light"
                rightSection={<IconArrowRight size={16} />}
                mt="xs"
              >
                Vedi Dettagli Prenotazioni
              </Button>
            </Stack>
          </Card>
        </Stack>
      )}
    </Stack>
  );
}

function ProgressStack({ occupied, total, color = "violet" }: { occupied: number, total: number, color?: string }) {
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
