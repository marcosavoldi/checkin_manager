import { 
  Title, Text, Paper, Group, Stack, SimpleGrid, RingProgress, 
  ThemeIcon, Center, Box, Divider, useComputedColorScheme
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { 
  IconUsers, IconBed, IconCash, IconCalendarStats, 
  IconTrendingUp
} from '@tabler/icons-react';
import { useState, useMemo, useEffect } from 'react';
import { fetchUpcomingBookings, type Booking } from '../services/bookingService';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';

dayjs.extend(isBetween);

export default function Statistics() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    dayjs().startOf('month').toDate(),
    dayjs().endOf('month').toDate()
  ]);
  const [loading, setLoading] = useState(true);
  const computedColorScheme = useComputedColorScheme('light');

  useEffect(() => {
    fetchUpcomingBookings().then(data => {
      setBookings(data);
      setLoading(false);
    });
  }, []);

  const glassStyles = {
    background: computedColorScheme === 'dark' ? 'rgba(30, 31, 37, 0.7)' : 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(16px)',
    border: computedColorScheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.4)',
    boxShadow: computedColorScheme === 'dark' 
      ? '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 0 0 1px rgba(255, 255, 255, 0.05)'
      : '0 8px 32px 0 rgba(31, 38, 135, 0.07), inset 0 0 0 1px rgba(255, 255, 255, 0.5)',
  };

  const stats = useMemo(() => {
    if (!dateRange[0] || !dateRange[1]) return null;
    
    const start = dayjs(dateRange[0]).startOf('day');
    const end = dayjs(dateRange[1]).endOf('day');
    const daysInPeriod = end.diff(start, 'day') + 1;

    // Filtriamo le prenotazioni che hanno almeno un giorno nel periodo
    const periodBookings = bookings.filter(b => {
      const bIn = dayjs(b.checkIn).startOf('day');
      const bOut = dayjs(b.checkOut).startOf('day');
      return (bIn.isBefore(end) || bIn.isSame(end)) && (bOut.isAfter(start) || bOut.isSame(start));
    });

    let totalNights = 0;
    let totalRevenue = 0;
    let guestsDistribution: Record<string, number> = {};
    let counts = { airbnb: 0, booking: 0, direct: 0 };

    periodBookings.forEach(b => {
      const bIn = dayjs(b.checkIn).startOf('day');
      const bOut = dayjs(b.checkOut).startOf('day');
      
      // Calcoliamo solo i giorni che cadono nel periodo selezionato
      const overlapStart = start.isAfter(bIn) ? start : bIn;
      const overlapEnd = end.isBefore(bOut) ? end : bOut;
      const nights = Math.max(0, overlapEnd.diff(overlapStart, 'day'));
      
      totalNights += nights;
      if (b.price) totalRevenue += b.price;
      
      const aCount = b.adults || 0;
      const cCount = b.children || 0;
      let label = `${aCount} Adult${aCount === 1 ? 'o' : 'i'}`;
      if (cCount > 0) label += ` + ${cCount} Bambin${cCount === 1 ? 'o' : 'i'}`;
      
      if (!guestsDistribution[label]) guestsDistribution[label] = 0;
      guestsDistribution[label] += nights;

      counts[b.source as keyof typeof counts]++;
    });

    const occupancyRate = (totalNights / daysInPeriod) * 100;
    const avgStay = periodBookings.length > 0 ? totalNights / periodBookings.length : 0;
    
    const guestsBreakdown = Object.entries(guestsDistribution)
      .map(([label, count]) => ({ 
          label, 
          perc: totalNights > 0 ? (count / totalNights) * 100 : 0 
      }))
      .sort((a, b) => b.perc - a.perc)
      .slice(0, 4);

    return {
      totalNights,
      totalRevenue,
      occupancyRate,
      avgStay,
      guestsBreakdown,
      counts,
      totalBookings: periodBookings.length
    };
  }, [bookings, dateRange]);

  if (loading) return <Text ta="center" py="xl">Caricamento statistiche...</Text>;

  return (
    <Stack gap="xl">
      <Box>
        <Title order={2} fw={800} lts="-0.5px" c={computedColorScheme === 'dark' ? 'white' : 'dark'}>Statistiche Dashboard</Title>
        <Text c="dimmed" size="sm">Analisi delle performance e dell'occupazione.</Text>
      </Box>

      <Paper p="md" radius="lg" style={glassStyles}>
        <DatePickerInput
          type="range"
          label="Periodo di analisi"
          placeholder="Seleziona date"
          value={dateRange}
          onChange={(val) => setDateRange(val as [Date | null, Date | null])}
          locale="it"
          radius="md"
          styles={{ input: { fontWeight: 600 } }}
        />
      </Paper>

      {stats ? (
        <>
          {/* Valori Principali */}
          <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="lg">
            <Paper p="xl" radius="24px" style={glassStyles}>
              <Stack gap={0}>
                <Group justify="space-between" mb="xs">
                  <ThemeIcon color="teal" variant="light" size="lg" radius="md">
                    <IconCash size={20} />
                  </ThemeIcon>
                  <IconTrendingUp size={16} color="var(--mantine-color-teal-6)" />
                </Group>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Fatturato Totale</Text>
                <Title order={3} fw={900} c="teal.7">
                  € {stats.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </Title>
              </Stack>
            </Paper>

            <Paper p="xl" radius="24px" style={glassStyles}>
              <Stack gap={0}>
                <Group justify="space-between" mb="xs">
                  <ThemeIcon color="blue" variant="light" size="lg" radius="md">
                    <IconBed size={20} />
                  </ThemeIcon>
                  <Text size="xl" fw={900} c="blue.7">{Math.round(stats.occupancyRate)}%</Text>
                </Group>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Occupazione</Text>
                <Title order={3} fw={900}>{stats.totalNights} Notti</Title>
              </Stack>
            </Paper>

            <Paper p="xl" radius="24px" style={glassStyles}>
              <Stack gap={0}>
                <Group justify="space-between" mb="xs">
                  <ThemeIcon color="orange" variant="light" size="lg" radius="md">
                    <IconUsers size={20} />
                  </ThemeIcon>
                </Group>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase" mb={4}>Ospiti (Notti %)</Text>
                {stats.guestsBreakdown.map((item, idx) => (
                  <Group key={idx} justify="space-between" my={2}>
                    <Text size="sm" fw={800} c="orange.7">{Math.round(item.perc)}%</Text>
                    <Text size="xs" c="dimmed" fw={600}>{item.label}</Text>
                  </Group>
                ))}
                {stats.guestsBreakdown.length === 0 && <Text size="sm" c="dimmed" mt={4}>- Nessun dato -</Text>}
              </Stack>
            </Paper>

            <Paper p="xl" radius="24px" style={glassStyles}>
              <Stack gap={0}>
                <Group justify="space-between" mb="xs">
                  <ThemeIcon color="indigo" variant="light" size="lg" radius="md">
                    <IconCalendarStats size={20} />
                  </ThemeIcon>
                </Group>
                <Text size="xs" c="dimmed" fw={700} tt="uppercase">Soggiorno Medio</Text>
                <Title order={3} fw={900}>{stats.avgStay.toFixed(1)} Notti</Title>
              </Stack>
            </Paper>
          </SimpleGrid>

          {/* Sezione Anelli Apple Style */}
          <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
            <Paper p="xl" radius="32px" style={glassStyles}>
              <Title order={4} mb="xl" fw={800}>Tasso di Occupazione</Title>
              <Center py="xl">
                <Box style={{ position: 'relative' }}>
                  <RingProgress
                    size={220}
                    thickness={22}
                    roundCaps
                    sections={[{ value: stats.occupancyRate, color: 'teal' }]}
                    label={
                      <Center>
                        <Stack gap={0} align="center">
                          <Text size="xl" fw={900}>{Math.round(stats.occupancyRate)}%</Text>
                          <Text size="xs" c="dimmed" tt="uppercase" fw={700}>Target</Text>
                        </Stack>
                      </Center>
                    }
                  />
                </Box>
              </Center>
              <Divider my="md" label="Highlights" labelPosition="center" />
              <Group justify="space-around" mt="md">
                <Stack align="center" gap={0}>
                  <Text fw={800} size="xl">{stats.totalBookings}</Text>
                  <Text size="xs" c="dimmed">Prenotazioni</Text>
                </Stack>
                <Stack align="center" gap={0}>
                  <Text fw={800} size="xl">{stats.totalNights}</Text>
                  <Text size="xs" c="dimmed">Notti</Text>
                </Stack>
              </Group>
            </Paper>

            <Paper p="xl" radius="32px" style={glassStyles}>
              <Title order={4} mb="xl" fw={800}>Distribuzione Canali</Title>
              <Center py="xl">
                <Box style={{ position: 'relative', width: 220, height: 220 }}>
                  {/* Anello Esterno: Airbnb */}
                  <div style={{ position: 'absolute', top: 0, left: 0 }}>
                    <RingProgress
                      size={220}
                      thickness={20}
                      roundCaps
                      sections={[{ value: stats.totalBookings > 0 ? (stats.counts.airbnb / stats.totalBookings) * 100 : 0, color: 'pink' }]}
                    />
                  </div>
                  {/* Anello Medio: Booking */}
                  <div style={{ position: 'absolute', top: 30, left: 30 }}>
                    <RingProgress
                      size={160}
                      thickness={20}
                      roundCaps
                      sections={[{ value: stats.totalBookings > 0 ? (stats.counts.booking / stats.totalBookings) * 100 : 0, color: 'blue' }]}
                    />
                  </div>
                  {/* Anello Interno: Direct */}
                  <div style={{ position: 'absolute', top: 60, left: 60 }}>
                    <RingProgress
                      size={100}
                      thickness={20}
                      roundCaps
                      sections={[{ value: stats.totalBookings > 0 ? (stats.counts.direct / stats.totalBookings) * 100 : 0, color: 'teal' }]}
                    />
                  </div>
                </Box>
              </Center>
              
              <Stack gap="xs" mt="md">
                <Group justify="space-between">
                  <Group gap={6}>
                    <Box w={12} h={12} bg="pink" style={{ borderRadius: 3 }} />
                    <Text size="sm" fw={600}>Airbnb</Text>
                  </Group>
                  <Text size="sm" fw={700}>{stats.counts.airbnb}</Text>
                </Group>
                <Group justify="space-between">
                  <Group gap={6}>
                    <Box w={12} h={12} bg="blue" style={{ borderRadius: 3 }} />
                    <Text size="sm" fw={600}>Booking.com</Text>
                  </Group>
                  <Text size="sm" fw={700}>{stats.counts.booking}</Text>
                </Group>
                <Group justify="space-between">
                  <Group gap={6}>
                    <Box w={12} h={12} bg="teal" style={{ borderRadius: 3 }} />
                    <Text size="sm" fw={600}>Dirette</Text>
                  </Group>
                  <Text size="sm" fw={700}>{stats.counts.direct}</Text>
                </Group>
              </Stack>
            </Paper>
          </SimpleGrid>
        </>
      ) : (
        <Paper p="xl" radius="lg" ta="center">
          <Text c="dimmed">Seleziona un periodo per vedere le statistiche.</Text>
        </Paper>
      )}
    </Stack>
  );
}
