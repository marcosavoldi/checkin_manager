import { useState, useEffect } from 'react';
import {
  Title, Button, Group, Stack, Text, Card, Badge,
  Modal, TextInput, Textarea, Select, ActionIcon, Tooltip,
  Box, Divider, ThemeIcon, Paper, NumberInput, Alert
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import type { DateValue } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconCalendarPlus, IconLogin, IconLogout, IconFileImport, IconCheck } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchUpcomingBookings,
  addBooking,
  updateBooking,
  deleteBooking,
  type Booking,
  type BookingSource
} from '../services/bookingService';
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

const IMPORT_DATA = [
  { "guestName": "Sebastiano Sabattini", "source": "booking", "checkIn": "2026-04-11 15:00:00", "checkOut": "2026-04-12 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Nicola Cavazzini", "source": "booking", "checkIn": "2026-07-18 15:00:00", "checkOut": "2026-07-19 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Zanya Crawford", "source": "booking", "checkIn": "2026-09-09 15:00:00", "checkOut": "2026-09-11 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Enrico Previtali", "source": "booking", "checkIn": "2026-03-27 15:00:00", "checkOut": "2026-03-28 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Monica Carpanese Beggiato", "source": "booking", "checkIn": "2026-03-25 15:00:00", "checkOut": "2026-03-26 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Matilda Jarvis", "source": "airbnb", "checkIn": "2026-04-12 15:00:00", "checkOut": "2026-04-13 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Dziyana Sadouskaya", "source": "booking", "checkIn": "2026-07-03 15:00:00", "checkOut": "2026-07-10 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Nicolo Vio", "source": "booking", "checkIn": "2026-04-02 15:00:00", "checkOut": "2026-04-03 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Sergio Montfort", "source": "booking", "checkIn": "2026-04-23 15:00:00", "checkOut": "2026-04-26 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Julia Jopek", "source": "booking", "checkIn": "2026-03-20 15:00:00", "checkOut": "2026-03-21 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Maciek Kożyczkowski", "source": "airbnb", "checkIn": "2026-04-18 14:00:00", "checkOut": "2026-04-21 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Mattia Riva", "source": "booking", "checkIn": "2026-03-21 14:00:00", "checkOut": "2026-03-22 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Andrea Selva", "source": "booking", "checkIn": "2026-05-09 15:00:00", "checkOut": "2026-05-10 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Prota Martina", "source": "booking", "checkIn": "2026-06-03 15:00:00", "checkOut": "2026-06-04 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Claudio Tamburini", "source": "booking", "checkIn": "2026-09-04 15:00:00", "checkOut": "2026-09-06 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Dorothea Bodeker", "source": "booking", "checkIn": "2026-04-03 14:00:00", "checkOut": "2026-04-06 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Martina Veneziano", "source": "airbnb", "checkIn": "2026-03-28 14:00:00", "checkOut": "2026-03-30 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Maurizio Guetti", "source": "booking", "checkIn": "2026-03-26 15:00:00", "checkOut": "2026-03-27 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Cinzia Poggi", "source": "booking", "checkIn": "2026-04-21 15:00:00", "checkOut": "2026-04-23 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Katarzyna Suminska", "source": "booking", "checkIn": "2026-06-28 14:00:00", "checkOut": "2026-06-29 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Arkadiusz Cyprych", "source": "booking", "checkIn": "2026-05-22 15:00:00", "checkOut": "2026-05-25 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Joana Amaro", "source": "airbnb", "checkIn": "2026-04-29 14:00:00", "checkOut": "2026-04-30 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Maffei Maria", "source": "booking", "checkIn": "2026-04-13 14:00:00", "checkOut": "2026-04-15 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Rafal Roslik", "source": "booking", "checkIn": "2026-04-10 15:00:00", "checkOut": "2026-04-11 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Brigitte Van Hooijdonk", "source": "booking", "checkIn": "2026-07-31 14:00:00", "checkOut": "2026-08-01 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Giovanna Capitanio", "source": "booking", "checkIn": "2026-04-07 15:00:00", "checkOut": "2026-04-10 11:00:00", "adults": 2, "children": 0 },
  { "guestName": "Mokrousova Anastasiia", "source": "booking", "checkIn": "2026-04-16 15:00:00", "checkOut": "2026-04-18 10:00:00", "adults": 2, "children": 0 },
  { "guestName": "Elena Sfondrini", "source": "booking", "checkIn": "2026-05-01 14:00:00", "checkOut": "2026-05-03 11:00:00", "adults": 2, "children": 0 }
];

const EMPTY_FORM = {
  checkIn: null as DateValue,
  checkOut: null as DateValue,
  source: 'airbnb' as BookingSource,
  guestName: '',
  staffNote: '',
  adminNote: '',
  adults: 2,
  children: 0
};

export default function ManageBookings() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [opened, { open, close }] = useDisclosure(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchUpcomingBookings();
      setBookings(data);
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
      staffNote: b.staffNote || '',
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
        staffNote: form.staffNote,
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

  const runBulkImport = async () => {
    if (!confirm(`Vuoi importare ${IMPORT_DATA.length} prenotazioni da CSV?`)) return;
    setImporting(true);
    try {
      let count = 0;
      for (const b of IMPORT_DATA) {
        await addBooking({
          guestName: b.guestName,
          source: b.source as BookingSource,
          checkIn: new Date(b.checkIn),
          checkOut: new Date(b.checkOut),
          adults: b.adults,
          children: b.children,
          staffNote: '',
          adminNote: 'Importato via CSV'
        }, user!.uid);
        count++;
      }
      setImportSuccess(count);
      await load();
    } catch (err) {
      console.error(err);
      alert('Errore durante l\'importazione. Controlla la console.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Box pb={80}>
      {/* ── Header ─────────────────────────────── */}
      <Group justify="space-between" mb="xl" align="flex-end">
        <div>
          <Title order={3} fw={700}>Gestione Prenotazioni</Title>
          <Text size="sm" c="dimmed">Inserisci e modifica le prenotazioni manualmente.</Text>
        </div>
        <Button
          leftSection={<IconCalendarPlus size={16} />}
          onClick={openAdd}
          size="sm"
          radius="md"
        >
          Aggiungi
        </Button>
      </Group>

      {/* ── Bulk Import (Temp) ──────────────────── */}
      <Paper withBorder p="md" mb="xl" radius="lg" style={{ borderColor: 'var(--mantine-color-violet-4)' }}>
        <Group justify="space-between" align="center">
          <div>
            <Group gap={8}>
              <IconFileImport size={20} color="var(--mantine-color-violet-6)" />
              <Text fw={700}>Importazione da CSV</Text>
            </Group>
            <Text size="xs" c="dimmed">Trovati {IMPORT_DATA.length} record in `prenotazioni.csv`</Text>
          </div>
          <Button 
            variant="light" color="violet" size="xs" 
            onClick={runBulkImport} loading={importing}
            disabled={importSuccess !== null}
          >
            Avvia Importazione
          </Button>
        </Group>
        {importSuccess !== null && (
          <Alert color="green" variant="light" mt="sm" icon={<IconCheck size={16} />}>
            Importazione completata con successo: {importSuccess} record aggiunti.
          </Alert>
        )}
      </Paper>

      {loading ? (
        <Text c="dimmed" ta="center" py="xl">Caricamento...</Text>
      ) : bookings.length === 0 ? (
        <Paper withBorder p="xl" ta="center" radius="lg">
          <IconCalendarPlus size={32} color="var(--mantine-color-dimmed)" />
          <Text c="dimmed" mt="sm">Nessuna prenotazione inserita.</Text>
          <Button mt="md" size="sm" onClick={openAdd}>Aggiungi la prima prenotazione</Button>
        </Paper>
      ) : (
        <Stack gap="md">
          {bookings.map(b => (
            <Card key={b.id} withBorder shadow="xs" radius="lg" padding="md">
              <Group justify="space-between" align="flex-start">
                <Group gap="md" align="flex-start" style={{ flex: 1 }}>
                  <Box>
                    <Badge color={SOURCE_COLORS[b.source]} variant="light" size="sm" mb={4}>
                      {SOURCE_LABELS[b.source]}
                    </Badge>
                    {b.guestName && <Text fw={600} size="sm">{b.guestName}</Text>}
                    <Group gap={4} mt={3}>
                      <Badge variant="transparent" color="gray" size="xs" p={0}>
                        {b.adults} Adulti {b.children > 0 && `, ${b.children} Bambini`}
                      </Badge>
                    </Group>
                  </Box>

                  <Divider orientation="vertical" />

                  <Group gap="xl">
                    <Group gap={6}>
                      <ThemeIcon color="green" variant="light" size="sm" radius="sm">
                        <IconLogin size={11} />
                      </ThemeIcon>
                      <div>
                        <Text size="xs" c="dimmed">Check-in</Text>
                        <Text fw={700} size="sm" c="green">{dayjs(b.checkIn).format('ddd DD MMM')}</Text>
                      </div>
                    </Group>

                    <Group gap={6}>
                      <ThemeIcon color="red" variant="light" size="sm" radius="sm">
                        <IconLogout size={11} />
                      </ThemeIcon>
                      <div>
                        <Text size="xs" c="dimmed">Check-out</Text>
                        <Text fw={700} size="sm" c="red">{dayjs(b.checkOut).format('ddd DD MMM')}</Text>
                      </div>
                    </Group>
                  </Group>
                </Group>

                <Group gap="xs" style={{ flexShrink: 0 }}>
                  <Tooltip label="Modifica">
                    <ActionIcon variant="subtle" color="blue" onClick={() => openEdit(b)}>
                      <IconEdit size={15} />
                    </ActionIcon>
                  </Tooltip>
                  <Tooltip label="Elimina">
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDelete(b.id!)}>
                      <IconTrash size={15} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Group>
            </Card>
          ))}
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
          <Textarea
            label="🟦 Nota Staff (visibile a tutto lo staff)"
            placeholder="es. Pannello elettrico sx, spugne blu sotto il lavandino..."
            value={form.staffNote}
            onChange={e => { const v = e.currentTarget.value; setForm(f => ({ ...f, staffNote: v })); }}
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
            styles={{ input: { borderColor: 'var(--mantine-color-violet-3)' } }}
          />
          <Group justify="flex-end" mt="xs">
            <Button variant="subtle" onClick={close} size="sm">Annulla</Button>
            <Button onClick={handleSave} loading={saving} disabled={!form.checkIn || !form.checkOut} size="sm">
              {editingId ? 'Salva Modifiche' : 'Aggiungi'}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Box>
  );
}
