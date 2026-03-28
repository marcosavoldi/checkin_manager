import { useState, useEffect } from 'react';
import {
  Title, Button, Group, Stack, Text, Divider, ThemeIcon, Paper, NumberInput, SimpleGrid, Container, Badge, Box
} from '@mantine/core';
import { IconBed, IconBath, IconPlus, IconRefresh, IconAlertCircle } from '@tabler/icons-react';
import { getLinenInventory, addCleanLinen, setLinenInventory, type LinenInventory } from '../services/inventoryService';
import dayjs from 'dayjs';

export default function LinenManagement() {
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

  const handleResetInventory = async () => {
    const b = prompt('Inserisci il nuovo totale Kit Letto disponibili ORA:');
    const t = prompt('Inserisci il nuovo totale Kit Asciugamani disponibili ORA:');
    if (b !== null && t !== null) {
      setInvLoading(true);
      try {
        await setLinenInventory(Number(b), Number(t));
        await load();
      } finally {
        setInvLoading(false);
      }
    }
  };

  if (loading) return <Text c="dimmed" ta="center" py="xl">Caricamento inventario...</Text>;

  return (
    <Container size="md" p="md">
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <div>
            <Title order={1} fw={900} lts="-1px">Biancheria</Title>
            <Text c="dimmed" size="sm" fw={500}>Monitoraggio e gestione dello stock pulito</Text>
          </div>
          <Button 
            variant="subtle" 
            color="gray" 
            radius="xl"
            leftSection={<IconRefresh size={18} />} 
            onClick={load}
          >
            Aggiorna
          </Button>
        </Group>

        {inventory && (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <Paper 
                withBorder 
                p="xl" 
                radius="24px" 
                shadow="sm"
                style={{ borderLeft: inventory.bedKits < 0 ? '6px solid var(--mantine-color-red-6)' : '6px solid var(--mantine-color-indigo-6)' }}
              >
                <Stack align="center" gap="xs">
                  <ThemeIcon size={64} radius="xl" color="indigo" variant="light">
                    <IconBed size={36} />
                  </ThemeIcon>
                  <Text size="xs" fw={800} c="dimmed" tt="uppercase" lts="1px">Kit Letto Disponibili</Text>
                  <Title order={1} size="64px" c={inventory.bedKits < 0 ? 'red.6' : 'indigo.9'} lts="-2px">
                    {inventory.bedKits}
                  </Title>
                  {inventory.bedKits < 0 && (
                    <Badge color="red" variant="dot" size="sm">Sotto scorta / Deficit</Badge>
                  )}
                </Stack>
              </Paper>

              <Paper 
                withBorder 
                p="xl" 
                radius="24px" 
                shadow="sm"
                style={{ borderLeft: inventory.towelKits < 0 ? '6px solid var(--mantine-color-red-6)' : '6px solid var(--mantine-color-teal-6)' }}
              >
                <Stack align="center" gap="xs">
                  <ThemeIcon size={64} radius="xl" color="teal" variant="light">
                    <IconBath size={36} />
                  </ThemeIcon>
                  <Text size="xs" fw={800} c="dimmed" tt="uppercase" lts="1px">Kit Asciugamani Disponibili</Text>
                  <Title order={1} size="64px" c={inventory.towelKits < 0 ? 'red.6' : 'teal.9'} lts="-2px">
                    {inventory.towelKits}
                  </Title>
                  {inventory.towelKits < 0 && (
                    <Badge color="red" variant="dot" size="sm">Sotto scorta / Deficit</Badge>
                  )}
                </Stack>
              </Paper>
            </SimpleGrid>

            {(inventory.bedKits === 0 && inventory.towelKits === 0) && (
              <Paper p="md" radius="lg" bg="orange.0" style={{ border: '1px solid var(--mantine-color-orange-2)' }}>
                <Group wrap="nowrap" gap="sm">
                  <IconAlertCircle color="var(--mantine-color-orange-6)" />
                  <Text size="sm" c="orange.9" fw={500}>
                    L'inventario è vuoto. Usa <b>"Rettifica Totali"</b> qui sotto per impostare la tua disponibilità attuale di kit puliti.
                  </Text>
                </Group>
              </Paper>
            )}

            <Paper withBorder p="xl" radius="24px" shadow="md">
              <Stack gap="lg">
                <Group gap="xs">
                  <ThemeIcon variant="filled" color="teal" radius="xl" size="md">
                    <IconPlus size={18} />
                  </ThemeIcon>
                  <Title order={4}>Registra Rientro dalla Lavanderia</Title>
                </Group>
                
                <SimpleGrid cols={{ base: 1, xs: 3 }} spacing="md">
                  <NumberInput 
                    label="Kit Letto Puliti" 
                    placeholder="0"
                    min={0} 
                    size="md"
                    radius="md"
                    value={addBeds} 
                    onChange={setAddBeds}
                  />
                  <NumberInput 
                    label="Kit Asciugamani Puliti" 
                    placeholder="0"
                    min={0} 
                    size="md"
                    radius="md"
                    value={addTowels} 
                    onChange={setAddTowels}
                  />
                  <Box style={{ display: 'flex', alignItems: 'flex-end' }}>
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
                      Aggiorna Stock
                    </Button>
                  </Box>
                </SimpleGrid>
                
                <Divider label="Configurazione Iniziale" labelPosition="center" color="gray.1" />
                
                <Group justify="center">
                  <Button 
                    variant="light" 
                    color="gray" 
                    size="xs" 
                    radius="xl"
                    onClick={handleResetInventory}
                    leftSection={<IconRefresh size={14} />}
                  >
                    Rettifica Manuale Totali
                  </Button>
                </Group>
              </Stack>
            </Paper>

            <Text size="xs" c="dimmed" ta="center" fw={500}>
              Aggiornato: {dayjs(inventory.lastUpdated?.toDate ? inventory.lastUpdated.toDate() : inventory.lastUpdated).format('DD MMMM [alle] HH:mm')}
            </Text>
          </>
        )}
      </Stack>
    </Container>
  );
}
