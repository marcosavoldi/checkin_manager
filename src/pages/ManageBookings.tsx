import {
  Title, Button, Group, Stack, Text, Card, Badge,
  Modal, TextInput, Textarea, Select, ActionIcon,
  Box, Divider, Paper, NumberInput, SegmentedControl, Center, Affix, Collapse
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import type { DateValue } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconCalendarPlus, IconPlus, IconSearch, IconFilter, IconX } from '@tabler/icons-react';
import { useMemo, useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchUpcomingBookings, addBooking, updateBooking, deleteBooking, type Booking, type BookingSource } from '../services/bookingService';
import dayjs from 'dayjs';
import 'dayjs/locale/it';

dayjs.locale('it');

const SOURCE_LABELS: Record<BookingSource, string> = {
  airbnb: 'Airbnb',
  booking: 'Booking.com',
  direct: 'Prenotazione Diretta'
};

const SOURCE_COLORS: Record<BookingSource, string> = {
  airbnb: 'pink',
  booking: 'blue',
  direct: 'teal'
};

const EMPTY_FORM = {
  checkIn: null as DateValue,
  checkOut: null as DateValue,
  source: 'airbnb' as BookingSource,
  guestName: '',
  staffNoteCheckIn: '',
  staffNoteCheckOut: '',
  staffNoteBooking: '',
  adminNote: '',
  adults: 2,
  children: 0
};

export default function ManageBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [opened, { open, close }] = useDisclosure(false);
  const [filter, setFilter] = useState<'future' | 'past' | 'all'>('future');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([null, null]);
  const [filtersOpened, { toggle: toggleFilters }] = useDisclosure(false);
  
  const today = dayjs().startOf('day');

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      // 1. Filtro Segmentato (Future/Past/All)
      const checkOutDate = dayjs(b.checkOut);
      let matchSegment = true;
      if (filter === 'future') matchSegment = checkOutDate.isSame(today, 'day') || checkOutDate.isAfter(today);
      else if (filter === 'past') matchSegment = checkOutDate.isBefore(today);

      if (!matchSegment) return false;

      // 2. Filtro Testo (Nome + Note)
      const searchLower = searchQuery.toLowerCase().trim();
      if (searchLower) {
        const matchText = 
          (b.guestName || '').toLowerCase().includes(searchLower) ||
          (b.staffNoteCheckIn || '').toLowerCase().includes(searchLower) ||
          (b.staffNoteCheckOut || '').toLowerCase().includes(searchLower) ||
          (b.staffNoteBooking || '').toLowerCase().includes(searchLower) ||
          (b.adminNote || '').toLowerCase().includes(searchLower);
        if (!matchText) return false;
      }

      // 3. Filtro Date (Check-in o Check-out nel range)
      if (dateRange[0] && dateRange[1]) {
        const start = dayjs(dateRange[0]).startOf('day');
        const end = dayjs(dateRange[1]).endOf('day');
        const cIn = dayjs(b.checkIn).startOf('day');
        const cOut = dayjs(b.checkOut).startOf('day');
        
        const inRange = (cIn.isAfter(start) || cIn.isSame(start)) && (cIn.isBefore(end) || cIn.isSame(end));
        const outRange = (cOut.isAfter(start) || cOut.isSame(start)) && (cOut.isBefore(end) || cOut.isSame(end));
        
        if (!inRange && !outRange) return false;
      }

      return true;
    });
  }, [bookings, filter, searchQuery, dateRange, today]);

  const load = async () => {
    setLoading(true);
    try {
      const bkngs = await fetchUpcomingBookings();
      setBookings(bkngs);
      
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_FORM); open(); };

  const openEdit = (b: Booking) => {
    setEditingId(b.id!);
    setForm({
      checkIn: b.checkIn, checkOut: b.checkOut,
      source: b.source, guestName: b.guestName || '',
      staffNoteCheckIn: b.staffNoteCheckIn || '',
      staffNoteCheckOut: b.staffNoteCheckOut || '',
      staffNoteBooking: b.staffNoteBooking || '',
      adminNote: b.adminNote || '',
      adults: b.adults || 0,
      children: b.children || 0
    });
    open();
  };

  const handleSave = async () => {
    if (!form.checkIn || !form.checkOut) return;
    setSaving(true);
    const checkIn = form.checkIn instanceof Date ? form.checkIn : new Date(form.checkIn);
    const checkOut = form.checkOut instanceof Date ? form.checkOut : new Date(form.checkOut);
    try {
      const payload = {
        checkIn, checkOut, source: form.source,
        guestName: form.guestName,
        staffNoteCheckIn: form.staffNoteCheckIn,
        staffNoteCheckOut: form.staffNoteCheckOut,
        staffNoteBooking: form.staffNoteBooking,
        adminNote: form.adminNote,
        adults: form.adults,
        children: form.children
      };
      if (editingId) await updateBooking(editingId, payload);
      else await addBooking(payload, user!.uid);
      close();
      await load();
    } finally {
      setSaving(false);
    }
  };


  const handleDelete = async (id: string) => {
    if (!confirm('Vuoi davvero eliminare questa prenotazione?')) return;
    await deleteBooking(id);
    await load();
  };

  return (
    <Box pb={80}>
      {/* ── Header ─────────────────────────────── */}
      <Group justify="space-between" mb="xl" align="flex-end">
        <div>
          <Title order={3} fw={700}>Gestione Prenotazioni</Title>
          <Text size="sm" c="dimmed">Inserisci e modifica le prenotazioni manualmente.</Text>
        </div>
      </Group>

      <Affix position={{ bottom: 20, right: 20 }}>
        <ActionIcon
          size={60}
          radius="xl"
          variant="filled"
          color="blue"
          onClick={openAdd}
          style={{ 
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
            zIndex: 100
          }}
        >
          <IconPlus size={30} stroke={2.5} />
        </ActionIcon>
      </Affix>

      <Stack gap="md" mb="xl">
        <Group gap="xs" wrap="nowrap">
          <TextInput
            placeholder="Cerca per nome o nelle note..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            style={{ flex: 1 }}
            radius="md"
            rightSection={searchQuery ? (
              <ActionIcon variant="transparent" color="gray" onClick={() => setSearchQuery('')}>
                <IconX size={14} />
              </ActionIcon>
            ) : null}
          />
          <ActionIcon 
            variant={filtersOpened ? 'filled' : 'light'} 
            color="indigo" 
            size="lg" 
            radius="md" 
            onClick={toggleFilters}
          >
            <IconFilter size={20} />
          </ActionIcon>
        </Group>

        <Collapse in={filtersOpened}>
          <Paper withBorder p="md" radius="md" style={{ background: 'var(--mantine-color-gray-0)' }}>
            <Stack gap="sm">
              <Text size="xs" fw={700} c="dimmed" tt="uppercase" lts="0.5px">Filtri Avanzati</Text>
              <Group grow align="flex-end">
                <DatePickerInput
                  type="range"
                  label="Periodo (Check-in o Out)"
                  placeholder="Seleziona intervallo"
                  value={dateRange}
                  onChange={(val) => setDateRange(val as [Date | null, Date | null])}
                  locale="it"
                  clearable
                  radius="md"
                />
                <Button 
                  variant="subtle" 
                  color="gray" 
                  size="sm" 
                  leftSection={<IconX size={14} />}
                  onClick={() => {
                    setSearchQuery('');
                    setDateRange([null, null]);
                  }}
                  disabled={!searchQuery && !dateRange[0]}
                >
                  Reset
                </Button>
              </Group>
            </Stack>
          </Paper>
        </Collapse>

        <Center>
          <SegmentedControl
            value={filter}
            onChange={(v: any) => setFilter(v)}
            radius="xl"
            size="sm"
            transitionDuration={200}
            color="indigo"
            data={[
              { label: 'Prossime', value: 'future' },
              { label: 'Passate', value: 'past' },
              { label: 'Tutte', value: 'all' },
            ]}
          />
        </Center>
      </Stack>

      {loading ? (
        <Text c="dimmed" ta="center" py="xl">Caricamento...</Text>
      ) : filteredBookings.length === 0 ? (
        <Paper withBorder p="xl" ta="center" radius="lg">
          <IconCalendarPlus size={32} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" mt="sm">
            {filter === 'future' ? 'Nessuna prenotazione imminente.' : 
             filter === 'past' ? 'Nessuna prenotazione passata.' : 
             'Nessuna prenotazione inserita.'}
          </Text>
          {filter === 'all' && (
            <Button mt="md" size="sm" onClick={openAdd}>Aggiungi la prima prenotazione</Button>
          )}
        </Paper>
      ) : (
        <Stack gap="md">
          {filteredBookings.map(b => {
            const nights = dayjs(b.checkOut).startOf('day').diff(dayjs(b.checkIn).startOf('day'), 'day');
            return (
              <Card key={b.id} withBorder shadow="sm" radius="lg" padding="md">
                <Stack gap="sm">
                  {/* Header: Info Ospite + Azioni */}
                  <Group justify="space-between" align="flex-start" wrap="nowrap">
                    <Stack gap={2}>
                      <Group gap="xs">
                        <Badge color={SOURCE_COLORS[b.source]} variant="light" size="xs">
                          {SOURCE_LABELS[b.source]}
                        </Badge>
                        {b.guestName ? (
                          <Text fw={800} size="sm" truncate>{b.guestName}</Text>
                        ) : (
                          <Text fw={700} size="sm" c="dimmed" fs="italic">Ospite</Text>
                        )}
                      </Group>
                      <Text size="xs" c="dimmed" fw={600}>
                        {b.adults} {b.adults === 1 ? 'Adulto' : 'Adulti'}
                        {b.children > 0 && ` + ${b.children} ${b.children === 1 ? 'Bambino' : 'Bambini'}`}
                      </Text>
                    </Stack>

                    <Group gap={4}>
                      <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(b)} size="sm">
                        <IconEdit size={16} />
                      </ActionIcon>
                      <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(b.id!)} size="sm">
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Group>
                  </Group>

                  {/* Barra Date: Split Check-in / Out */}
                  <Paper withBorder p={4} radius="md" style={{ background: 'rgba(0,0,0,0.02)', borderColor: 'rgba(0,0,0,0.05)' }}>
                    <Group grow gap={0} wrap="nowrap">
                      {/* Check-in */}
                      <Stack gap={0} align="center" style={{ flex: 1 }}>
                        <Text size="9px" fw={800} tt="uppercase" c="dimmed">Check-in</Text>
                        <Text fw={700} size="sm" c="green.7">
                          {dayjs(b.checkIn).format('ddd DD MMM')}
                        </Text>
                      </Stack>

                      {/* Divider con Notti */}
                      <Stack gap={0} align="center" style={{ width: 60 }}>
                        <Divider orientation="vertical" h={15} style={{ opacity: 0.3 }} />
                        <Badge variant="outline" color="gray" size="xs" radius="sm" fw={800} style={{ fontSize: '8px', height: '14px', padding: '0 4px', borderStyle: 'dashed' }}>
                          {nights} {nights === 1 ? 'NOTTE' : 'NOTTI'}
                        </Badge>
                        <Divider orientation="vertical" h={15} style={{ opacity: 0.3 }} />
                      </Stack>

                      {/* Check-out */}
                      <Stack gap={0} align="center" style={{ flex: 1 }}>
                        <Text size="9px" fw={800} tt="uppercase" c="dimmed">Check-out</Text>
                        <Text fw={700} size="sm" c="red.7">
                          {dayjs(b.checkOut).format('ddd DD MMM')}
                        </Text>
                      </Stack>
                    </Group>
                  </Paper>
                </Stack>
              </Card>
            );
          })}
        </Stack>
      )}

      {/* ── Modale Aggiungi / Modifica ─────────── */}
      <Modal
        opened={opened}
        onClose={close}
        title={<Text fw={700}>{editingId ? 'Modifica Prenotazione' : 'Nuova Prenotazione'}</Text>}
        centered
        size="md"
        radius="lg"
      >
        <Stack gap="sm">
          <Select
            label="Fonte"
            value={form.source}
            onChange={v => setForm(f => ({ ...f, source: v as BookingSource }))}
            data={[
              { value: 'airbnb', label: 'Airbnb' },
              { value: 'booking', label: 'Booking.com' },
              { value: 'direct', label: 'Prenotazione Diretta' }
            ]}
          />
          <Group grow>
            <DatePickerInput
              label="Check-in"
              placeholder="Seleziona data"
              value={form.checkIn}
              onChange={d => setForm(f => ({ ...f, checkIn: d }))}
              locale="it"
              required
            />
            <DatePickerInput
              label="Check-out"
              placeholder="Seleziona data"
              value={form.checkOut}
              onChange={d => setForm(f => ({ ...f, checkOut: d }))}
              locale="it"
              minDate={form.checkIn ?? undefined}
              required
            />
          </Group>
          <TextInput
            label="Nome Ospite (opzionale)"
            placeholder="es. Mario Rossi"
            value={form.guestName}
            onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, guestName: v })); }}
          />
          
          <Divider label="Note per lo Staff" labelPosition="center" color="blue.2" />
          
          <Textarea
            label="📥 Nota Check-in"
            placeholder="es. Consegna chiavi alle 15:00, mostrare caldaia..."
            value={form.staffNoteCheckIn}
            onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, staffNoteCheckIn: v })); }}
            autosize
            minRows={2}
          />
          <Textarea
            label="📤 Nota Check-out"
            placeholder="es. Controllare telecomando, ritiro spazzatura..."
            value={form.staffNoteCheckOut}
            onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, staffNoteCheckOut: v })); }}
            autosize
            minRows={2}
          />
          <Textarea
            label="📝 Nota Prenotazione"
            placeholder="es. Pannello elettrico sx, spugne blu sotto il lavandino..."
            value={form.staffNoteBooking}
            onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, staffNoteBooking: v })); }}
            autosize
            minRows={2}
          />

          <Group grow>
            <NumberInput
              label="Adulti"
              min={1}
              value={form.adults}
              onChange={(v: string | number) => setForm(f => ({ ...f, adults: Number(v) || 0 }))}
            />
            <NumberInput
              label="Bambini"
              min={0}
              value={form.children}
              onChange={(v: string | number) => setForm(f => ({ ...f, children: Number(v) || 0 }))}
            />
          </Group>
          <Textarea
            label="🔒 Nota Admin (visibile solo a te)"
            placeholder="es. Codice cassaforte: 1234, WiFi password..."
            value={form.adminNote}
            onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, adminNote: v })); }}
            autosize
            minRows={2}
            styles={{ input: { borderColor: 'var(--mantine-color-indigo-3)' } }}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={close} size="sm">Annulla</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.checkIn || !form.checkOut} size="sm" color="indigo">
              {editingId ? 'Salva Modifiche' : 'Aggiungi'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
