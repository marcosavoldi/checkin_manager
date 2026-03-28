import { useState, useEffect } from 'react';
import {
  Title, Button, Group, Stack, Text, Divider, ThemeIcon, Paper, NumberInput, SimpleGrid, Container, useComputedColorScheme
} from '@mantine/core';
import { IconBed, IconBath, IconAlertCircle } from '@tabler/icons-react';
import { getLinenInventory, addCleanLinen, type LinenInventory } from '../services/inventoryService';
import dayjs from 'dayjs';

export default function LinenManagement() {
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  const glassStyles = {
    background: computedColorScheme === 'dark' ? 'rgba(36, 36, 36, 0.4)' : 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    border: computedColorScheme === 'dark' ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(255, 255, 255, 0.3)',
  };
  const [inventory, setInventory] = useState<LinenInventory | null>(null);
  const [loading, setLoading] = useState(true);
  const [invLoading, setInvLoading] = useState(false);
  const [addBeds, setAddBeds] = useState<number | string>(0);
  const [addTowels, setAddTowels] = useState<number | string>(0);

  const load = async () => {
    setLoading(true);
    try {
      const inv = await getLinenInventory();
      setInventory(inv);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleRestock = async () => {
    if (!addBeds && !addTowels) return;
    setInvLoading(true);
    try {
      await addCleanLinen(Number(addBeds) || 0, Number(addTowels) || 0);
      setAddBeds(0);
      setAddTowels(0);
      await load();
    } finally {
      setInvLoading(false);
    }
  };


  if (loading) return <Text c="dimmed" ta="center" py="xl">Caricamento inventario...</Text>;

  return (
    <Container size="md" p="md">
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <div>
            <Title order={1} fw={900} lts="-1px" c="var(--mantine-color-text)">Biancheria</Title>
            <Text c="dimmed" size="sm" fw={500}>Gestione stock e rientri lavanderia</Text>
          </div>
        </Group>

        {inventory && (
          <Stack gap="lg">
            {/* 1. SEZIONE CARICO (Responsiva) */}
            <Paper withBorder p="lg" radius="24px" shadow="md" style={glassStyles}>
              <Stack gap="md">
                <Title order={5} tt="uppercase" lts="1px" c="dimmed" ta="center">Registra Rientro Lavanderia</Title>
                
                <SimpleGrid cols={{ base: 1, xs: 2 }} spacing="xs">
                  <NumberInput 
                    label="Kit Letto" 
                    placeholder="0"
                    min={0} 
                    size="md"
                    radius="md"
                    value={addBeds} 
                    onChange={setAddBeds}
                  />
                  <NumberInput 
                    label="Kit Asciugamani" 
                    placeholder="0"
                    min={0} 
                    size="md"
                    radius="md"
                    value={addTowels} 
                    onChange={setAddTowels}
                  />
                </SimpleGrid>
                
                <Button 
                  variant="filled" 
                  color="teal" 
                  size="md"
                  radius="md"
                  fullWidth
                  onClick={handleRestock} 
                  loading={invLoading}
                  disabled={!addBeds && !addTowels}
                >
                  Carica Kit Puliti
                </Button>
              </Stack>
            </Paper>

            {(inventory.bedKits === 0 && inventory.towelKits === 0) && (
              <Paper p="md" radius="lg" bg="orange.0" style={{ ...glassStyles, border: "1px solid var(--mantine-color-orange-2)" }}>
                <Group wrap="nowrap" gap="sm">
                  <IconAlertCircle color="var(--mantine-color-orange-6)" />
                  <Text size="sm" c="orange.9" fw={500}>
                    L'inventario è vuoto. Imposta la tua disponibilità attuale di kit puliti.
                  </Text>
                </Group>
              </Paper>
            )}

            <Divider label="Riepilogo Disponibilità" labelPosition="center" color="gray.2" />

            {/* 2. STATO INVENTARIO */}
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Paper 
                withBorder 
                p="md" 
                radius="xl" 
                shadow="sm"
                style={{ ...glassStyles, borderLeft: inventory.bedKits < 0 ? "6px solid var(--mantine-color-red-6)" : "6px solid var(--mantine-color-indigo-6)" }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm">
                    <ThemeIcon size={40} radius="xl" color="indigo" variant="light">
                      <IconBed size={22} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" fw={800} c="dimmed" tt="uppercase" lts="1px">Kit Letto</Text>
                      <Text size="xs" c="dimmed" fw={500}>Disponibili</Text>
                    </div>
                  </Group>
                  <Title order={2} c={inventory.bedKits < 0 ? 'red.6' : 'indigo.9'} lts="-1px">
                    {inventory.bedKits}
                  </Title>
                </Group>
              </Paper>

              <Paper 
                withBorder 
                p="md" 
                radius="xl" 
                shadow="sm"
                style={{ ...glassStyles, borderLeft: inventory.towelKits < 0 ? "6px solid var(--mantine-color-red-6)" : "6px solid var(--mantine-color-teal-6)" }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Group gap="sm">
                    <ThemeIcon size={40} radius="xl" color="teal" variant="light">
                      <IconBath size={22} />
                    </ThemeIcon>
                    <div>
                      <Text size="xs" fw={800} c="dimmed" tt="uppercase" lts="1px">Kit Asciugamani</Text>
                      <Text size="xs" c="dimmed" fw={500}>Disponibili</Text>
                    </div>
                  </Group>
                  <Title order={2} c={inventory.towelKits < 0 ? 'red.6' : 'teal.9'} lts="-1px">
                    {inventory.towelKits}
                  </Title>
                </Group>
              </Paper>
            </SimpleGrid>

            <Group justify="center" mt="xs">
              <Text size="xs" c="dimmed" fw={500}>
                Ultimo aggiornamento: {dayjs(inventory.lastUpdated?.toDate ? inventory.lastUpdated.toDate() : inventory.lastUpdated).format('DD MMM, HH:mm')}
              </Text>
            </Group>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
