import { useState, useEffect } from 'react';
import {
  Card, Stack, Text, Title, Group, ThemeIcon, Button, Badge, Paper,
  useComputedColorScheme
} from '@mantine/core';
import { IconBell, IconCheck, IconCalendarStats, IconReceipt2 } from '@tabler/icons-react';
import dayjs from 'dayjs';
import 'dayjs/locale/it';
import {
  getDeadlineConfirmations,
  confirmRoss1000,
  confirmTouristTax
} from '../services/deadlineService';

dayjs.locale('it');

interface DeadlineWidgetProps {
  glassStyles: React.CSSProperties;
}

export default function DeadlineWidget({ glassStyles }: DeadlineWidgetProps) {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const [confirmations, setConfirmations] = useState<{
    ross1000?: string;
    touristTax?: string;
  } | null>(null);
  const [loadingRoss, setLoadingRoss] = useState(false);
  const [loadingTax, setLoadingTax] = useState(false);

  useEffect(() => {
    getDeadlineConfirmations()
      .then(data => {
        setConfirmations({
          ross1000: data.ross1000LastConfirmed,
          touristTax: data.touristTaxLastConfirmed,
        });
      })
      .catch(() => {
        // Regole Firestore non ancora configurate: mostra le scadenze senza persistenza
        setConfirmations({});
      });
  }, []);

  if (confirmations === null) return null;

  const today = dayjs();
  const day = today.date();
  const month = today.month() + 1; // 1-indexed
  const year = today.year();

  // --- ROSS1000: attivo giorni 1-5 del mese ---
  const prevMonthKey = today.subtract(1, 'month').format('YYYY-MM');
  const ross1000Active = day >= 1 && day <= 5 && confirmations.ross1000 !== prevMonthKey;

  // --- Tassa di soggiorno: attivo giorni 1-15 di apr(4), lug(7), ott(10), gen(1) ---
  const taxMonths = [1, 4, 7, 10];
  let touristTaxKey = '';
  if (taxMonths.includes(month) && day >= 1 && day <= 15) {
    if (month === 4)  touristTaxKey = `${year}-Q1`;
    if (month === 7)  touristTaxKey = `${year}-Q2`;
    if (month === 10) touristTaxKey = `${year}-Q3`;
    if (month === 1)  touristTaxKey = `${year - 1}-Q4`;
  }
  const touristTaxActive = !!touristTaxKey && confirmations.touristTax !== touristTaxKey;

  if (!ross1000Active && !touristTaxActive) return null;

  const quarterLabel: Record<string, string> = {
    Q1: '1° Trimestre', Q2: '2° Trimestre', Q3: '3° Trimestre', Q4: '4° Trimestre'
  };
  const currentQuarter = touristTaxKey ? (touristTaxKey.split('-')[1] as keyof typeof quarterLabel) : 'Q1';
  const activeCount = [ross1000Active, touristTaxActive].filter(Boolean).length;

  const handleConfirmRoss = async () => {
    setLoadingRoss(true);
    try {
      await confirmRoss1000(prevMonthKey);
      setConfirmations(c => ({ ...c!, ross1000: prevMonthKey }));
    } finally {
      setLoadingRoss(false);
    }
  };

  const handleConfirmTax = async () => {
    setLoadingTax(true);
    try {
      await confirmTouristTax(touristTaxKey);
      setConfirmations(c => ({ ...c!, touristTax: touristTaxKey }));
    } finally {
      setLoadingTax(false);
    }
  };

  return (
    <Card
      withBorder
      radius="24px"
      p="xl"
      style={{
        ...glassStyles,
        background: computedColorScheme === 'dark'
          ? 'linear-gradient(135deg, rgba(253, 126, 20, 0.1) 0%, rgba(36, 36, 36, 0.5) 100%)'
          : 'linear-gradient(135deg, rgba(253, 126, 20, 0.07) 0%, rgba(255, 255, 255, 0.85) 100%)',
        borderColor: computedColorScheme === 'dark'
          ? 'rgba(253, 126, 20, 0.28)'
          : 'rgba(253, 126, 20, 0.22)',
      }}
    >
      <Stack gap="md">
        {/* Header */}
        <Group gap="sm" align="center" wrap="nowrap">
          <ThemeIcon
            size="lg"
            radius="xl"
            variant="gradient"
            gradient={{ from: 'orange.5', to: 'red.6' }}
          >
            <IconBell size={18} />
          </ThemeIcon>
          <Stack gap={1} style={{ flex: 1 }}>
            <Text size="11px" fw={900} tt="uppercase" c="orange.6" lts="1.8px">Promemoria</Text>
            <Title order={4} fw={900}>Scadenze Amministrative</Title>
          </Stack>
          <Badge
            color="orange"
            variant="filled"
            size="sm"
            radius="sm"
          >
            {activeCount} {activeCount === 1 ? 'ATTIVA' : 'ATTIVE'}
          </Badge>
        </Group>

        {/* ROSS1000 */}
        {ross1000Active && (
          <Paper
            withBorder
            p="lg"
            radius="20px"
            style={{
              background: computedColorScheme === 'dark'
                ? 'rgba(253, 126, 20, 0.08)'
                : 'rgba(253, 126, 20, 0.05)',
              borderColor: computedColorScheme === 'dark'
                ? 'rgba(253, 126, 20, 0.22)'
                : 'rgba(253, 126, 20, 0.28)',
            }}
          >
            <Stack gap="sm">
              <Group gap="md" wrap="nowrap">
                <ThemeIcon size={40} radius="10px" color="orange" variant="light" style={{ flexShrink: 0 }}>
                  <IconCalendarStats size={20} />
                </ThemeIcon>
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="xs" wrap="wrap">
                    <Text size="xs" fw={900} tt="uppercase" c="orange.7" lts="0.8px">ROSS1000</Text>
                    <Badge size="xs" color="orange" variant="dot">
                      entro il 5 {today.format('MMMM')}
                    </Badge>
                  </Group>
                  <Text size="sm" fw={700} style={{ lineHeight: 1.4 }}>
                    Verifica completamento dati del mese scorso su ROSS1000!
                  </Text>
                  <Text size="xs" c="dimmed" fw={500}>
                    Dati di {today.subtract(1, 'month').format('MMMM YYYY')}
                  </Text>
                </Stack>
              </Group>
              <Button
                size="sm"
                radius="xl"
                color="orange"
                variant="filled"
                fullWidth
                leftSection={<IconCheck size={15} />}
                loading={loadingRoss}
                onClick={handleConfirmRoss}
              >
                Ho verificato
              </Button>
            </Stack>
          </Paper>
        )}

        {/* Tassa di soggiorno */}
        {touristTaxActive && (
          <Paper
            withBorder
            p="lg"
            radius="20px"
            style={{
              background: computedColorScheme === 'dark'
                ? 'rgba(250, 82, 82, 0.08)'
                : 'rgba(250, 82, 82, 0.04)',
              borderColor: computedColorScheme === 'dark'
                ? 'rgba(250, 82, 82, 0.22)'
                : 'rgba(250, 82, 82, 0.2)',
            }}
          >
            <Stack gap="sm">
              <Group gap="md" wrap="nowrap">
                <ThemeIcon size={40} radius="10px" color="red" variant="light" style={{ flexShrink: 0 }}>
                  <IconReceipt2 size={20} />
                </ThemeIcon>
                <Stack gap={2} style={{ flex: 1, minWidth: 0 }}>
                  <Group gap="xs" wrap="wrap">
                    <Text size="xs" fw={900} tt="uppercase" c="red.7" lts="0.8px">Tassa di Soggiorno</Text>
                    <Badge size="xs" color="red" variant="dot">
                      {quarterLabel[currentQuarter]}
                    </Badge>
                  </Group>
                  <Text size="sm" fw={700} style={{ lineHeight: 1.4 }}>
                    Verifica dichiarazione tassa di soggiorno e relativo versamento.
                  </Text>
                  <Text size="xs" c="dimmed" fw={500}>
                    Scadenza: 15 {today.format('MMMM YYYY')}
                  </Text>
                </Stack>
              </Group>
              <Button
                size="sm"
                radius="xl"
                color="red"
                variant="filled"
                fullWidth
                leftSection={<IconCheck size={15} />}
                loading={loadingTax}
                onClick={handleConfirmTax}
              >
                Ho verificato
              </Button>
            </Stack>
          </Paper>
        )}
      </Stack>
    </Card>
  );
}
