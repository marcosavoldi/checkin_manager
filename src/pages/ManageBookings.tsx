import { useState, useEffect } from 'react';
import {
  Title, Button, Group, Stack, Text, Card, Badge,
  Modal, TextInput, Textarea, Select, ActionIcon, Tooltip,
  Box, Divider, ThemeIcon, Paper, NumberInput
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import type { DateValue } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { IconEdit, IconTrash, IconCalendarPlus, IconLogin, IconLogout, IconShirt, IconPlus } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchUpcomingBookings,
  addBooking,
  updateBooking,
  deleteBooking,
  type Booking,
  type BookingSource
} from '../services/bookingService';
import { getLinenInventory, addCleanLinen, setLinenInventory, type LinenInventory } from '../services/inventoryService';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [opened, { open, close }] = useDisclosure(false);
  
  // State per inventario
  const [inventory, setInventory] = useState<LinenInventory | null>(null);
  const [invLoading, setInvLoading] = useState(false);
  const [addBeds, setAddBeds] = useState<number | string>(0);
  const [addTowels, setAddTowels] = useState<number | string>(0);

  const load = async () => {
    setLoading(true);
    try {
      const bkngs = await fetchUpcomingBookings();
      setBookings(bkngs);
      
      try {
        const inv = await getLinenInventory();
        setInventory(inv);
      } catch (err) {
        console.warn('Inventory fetch failed (check firestore rules):', err);
      }
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

  const handleRestock = async () => {
    if (!addBeds && !addTowels) return;
    setInvLoading(true);
    try {
      await addCleanLinen(Number(addBeds) || 0, Number(addTowels) || 0);
      setAddBeds(0);
      setAddTowels(0);
      const updated = await getLinenInventory();
      setInventory(updated);
    } finally {
      setInvLoading(false);
    }
  };

  const handleResetInventory = async () => {
    const b = prompt('Inserisci il nuovo totale Kit Letto:');
    const t = prompt('Inserisci il nuovo totale Kit Asciugamani:');
    if (b !== null && t !== null) {
      setInvLoading(true);
      try {
        await setLinenInventory(Number(b), Number(t));
        const updated = await getLinenInventory();
        setInventory(updated);
      } finally {
        setInvLoading(false);
      }
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
        <Button
          leftSection={<IconCalendarPlus size={16} />}
          onClick={openAdd}
          size="sm"
          radius="md"
        >
          Aggiungi
        </Button>
      </Group>

      {/* ── Gestione Inventario ────────────────── */}
      {inventory && (
        <Paper withBorder p="md" mb="xl" radius="lg" style={{ borderColor: 'var(--mantine-color-teal-2)', background: 'var(--mantine-color-teal-light)' }}>
          <Stack gap="xs">
            <Group justify="space-between" align="center">
              <Group gap="xs">
                <ThemeIcon variant="light" color="teal" radius="md">
                  <IconShirt size={18} />
                </ThemeIcon>
                <Text fw={700} size="sm">Gestione Inventario Puliti</Text>
              </Group>
              <Button variant="subtle" color="gray" size="compact-xs" onClick={handleResetInventory}>Rettifica Totali</Button>
            </Group>
            
            <Group grow align="flex-end" gap="md">
              <NumberInput 
                label="Rientro Letto" 
                size="xs" 
                min={0} 
                value={addBeds} 
                onChange={setAddBeds}
                placeholder="+0"
              />
              <NumberInput 
                label="Rientro Asciugamani" 
                size="xs" 
                min={0} 
                value={addTowels} 
                onChange={setAddTowels}
                placeholder="+0"
              />
              <Button 
                variant="filled" 
                color="teal" 
                size="xs" 
                onClick={handleRestock} 
                loading={invLoading}
                leftSection={<IconPlus size={14} />}
              >
                Aggiungi
              </Button>
            </Group>
            
            <Divider color="white" />
            
            <Group justify="space-around">
              <Box ta="center">
                <Text size="11px" fw={700} c="dimmed" tt="uppercase">Attuali Letto</Text>
                <Text fw={800} size="xl" c="teal.9">{inventory.bedKits}</Text>
              </Box>
              <Box ta="center">
                <Text size="11px" fw={700} c="dimmed" tt="uppercase">Attuali Asciugamani</Text>
                <Text fw={800} size="xl" c="teal.9">{inventory.towelKits}</Text>
              </Box>
            </Group>
          </Stack>
        </Paper>
      )}

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
