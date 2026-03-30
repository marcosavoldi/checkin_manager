import {
  Modal, Text, Group, Stack, Badge, Paper, ThemeIcon, Divider
} from '@mantine/core';
import { IconUsers, IconLock, IconLogin, IconLogout, IconNotes } from '@tabler/icons-react';
import { type Booking } from '../services/bookingService';
import { useAuth } from '../context/AuthContext';
import dayjs from 'dayjs';
import 'dayjs/locale/it';

dayjs.locale('it');

const SOURCE_COLORS: Record<string, string> = {
  airbnb: 'pink', booking: 'blue', direct: 'teal', unknown: 'gray'
};
const SOURCE_LABELS: Record<string, string> = {
  airbnb: 'Airbnb', booking: 'Booking.com', direct: 'Diretta', unknown: 'Sconosciuta'
};

interface Props {
  opened: boolean;
  onClose: () => void;
  booking: Booking | null;
}

export default function BookingDetailModal({ opened, onClose, booking }: Props) {
  const { user } = useAuth();
  const isAdmin = user?.appRole === 'admin';

  if (!booking) return null;

  const source = booking.source ?? 'unknown';

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          {isAdmin ? (
            <>
              <Badge color={SOURCE_COLORS[source]} size="sm">{SOURCE_LABELS[source]}</Badge>
              <Text fw={600} size="sm">{booking.guestName || 'Ospite'}</Text>
            </>
          ) : (
            <>
              <Badge color="gray" size="sm">Prenotazione</Badge>
              <Text fw={600} size="sm">Dettagli Staff</Text>
            </>
          )}
        </Group>
      }
      size="md"
      centered
      radius="lg"
    >
      <Stack gap="md">
        {/* Ospiti */}
        <Paper withBorder p="sm" radius="md" style={{ borderLeft: '4px solid var(--mantine-color-teal-6)' }}>
          <Group justify="space-between">
            <Group gap="xs">
              <ThemeIcon color="teal" variant="light" size="sm">
                <IconUsers size={14} />
              </ThemeIcon>
              <Text size="sm" fw={600}>Ospiti</Text>
            </Group>
            <Text size="sm" fw={700}>
              {booking.adults} Adulti {booking.children > 0 && `+ ${booking.children} Bambini`}
            </Text>
          </Group>
        </Paper>

        {/* Date */}
        <Group grow>
          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">Check-in</Text>
            <Text fw={700} c="green">{dayjs(booking.checkIn).format('ddd DD MMM YYYY')}</Text>
          </Paper>
          <Paper withBorder p="sm" radius="md">
            <Text size="xs" c="dimmed">Check-out</Text>
            <Text fw={700} c="red">{dayjs(booking.checkOut).format('ddd DD MMM YYYY')}</Text>
          </Paper>
        </Group>

        <Divider label="Note per lo Staff" labelPosition="center" />

        {/* Note Check-in */}
        {booking.staffNoteCheckIn && (
          <Paper withBorder p="md" radius="md" bg="green.0">
            <Group gap="xs" mb="xs">
              <ThemeIcon color="green" variant="light" size="sm" radius="sm">
                <IconLogin size={12} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="green.9">Nota Check-in</Text>
            </Group>
            <Text size="sm">{booking.staffNoteCheckIn}</Text>
          </Paper>
        )}

        {/* Note Check-out */}
        {booking.staffNoteCheckOut && (
          <Paper withBorder p="md" radius="md" bg="red.0">
            <Group gap="xs" mb="xs">
              <ThemeIcon color="red" variant="light" size="sm" radius="sm">
                <IconLogout size={12} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="red.9">Nota Check-out</Text>
            </Group>
            <Text size="sm">{booking.staffNoteCheckOut}</Text>
          </Paper>
        )}

        {/* Nota Prenotazione */}
        {booking.staffNoteBooking && (
          <Paper withBorder p="md" radius="md" bg="blue.0">
            <Group gap="xs" mb="xs">
              <ThemeIcon color="blue" variant="light" size="sm" radius="sm">
                <IconNotes size={12} stroke={1.5} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="blue.9">Nota Prenotazione</Text>
            </Group>
            <Text size="sm">{booking.staffNoteBooking}</Text>
          </Paper>
        )}

        {(!booking.staffNoteCheckIn && !booking.staffNoteCheckOut && !booking.staffNoteBooking) && (
          <Text size="sm" c="dimmed" ta="center" fs="italic">Nessuna nota per lo staff.</Text>
        )}

        {/* Nota Admin — visibile solo all'admin */}
        {isAdmin && (
          <Paper withBorder p="md" radius="md" bg="violet.0"
            style={{ borderColor: 'var(--mantine-color-violet-3)' }}>
            <Group gap="xs" mb="xs">
              <ThemeIcon color="violet" variant="light" size="sm" radius="sm">
                <IconLock size={12} />
              </ThemeIcon>
              <Text size="sm" fw={600} c="violet">Nota Riservata Admin</Text>
            </Group>
            {booking.adminNote ? (
              <Text size="sm">{booking.adminNote}</Text>
            ) : (
              <Text size="sm" c="dimmed" fs="italic">Nessuna nota riservata.</Text>
            )}
          </Paper>
        )}
      </Stack>
    </Modal>
  );
}
