import { useState, useEffect } from 'react';
import {
  Title, Button, Group, Stack, Text, Divider, ThemeIcon, Paper, NumberInput, SimpleGrid, Container
} from '@mantine/core';
import { IconShirt, IconPlus, IconRefresh } from '@tabler/icons-react';
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
            <Title order={2} fw={800}>Gestione Biancheria</Title>
            <Text c="dimmed" size="sm">Monitoraggio e rifornimento kit puliti</Text>
          </div>
          <Button variant="light" color="gray" leftSection={<IconRefresh size={16} />} onClick={load}>Aggiorna</Button>
        </Group>

        {inventory && (
          <>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
              <Paper withBorder p="xl" radius="lg" shadow="sm">
                <Stack align="center" gap={5}>
                  <ThemeIcon size={50} radius="md" color="blue" variant="light">
                    <IconShirt size={30} />
                  </ThemeIcon>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">Kit Letto Disponibili</Text>
                  <Title order={1} size="48px" c={inventory.bedKits < 0 ? 'red' : 'blue'}>
                    {inventory.bedKits}
                  </Title>
                </Stack>
              </Paper>

              <Paper withBorder p="xl" radius="lg" shadow="sm">
                <Stack align="center" gap={5}>
                  <ThemeIcon size={50} radius="md" color="teal" variant="light">
                    <IconShirt size={30} />
                  </ThemeIcon>
                  <Text size="xs" fw={700} c="dimmed" tt="uppercase">Kit Asciugamani Disponibili</Text>
                  <Title order={1} size="48px" c={inventory.towelKits < 0 ? 'red' : 'teal'}>
                    {inventory.towelKits}
                  </Title>
                </Stack>
              </Paper>
            </SimpleGrid>

            <Paper withBorder p="md" radius="lg" shadow="sm">
              <Stack gap="md">
                <Group gap="xs">
                  <ThemeIcon variant="filled" color="teal" radius="sm" size="sm">
                    <IconPlus size={14} />
                  </ThemeIcon>
                  <Text fw={700} size="sm">Aggiungi Kit Rientrati dalla Lavanderia</Text>
                </Group>
                
                <SimpleGrid cols={{ base: 1, xs: 3 }}>
                  <NumberInput 
                    label="Kit Letto (+)" 
                    min={0} 
                    value={addBeds} 
                    onChange={setAddBeds}
                  />
                  <NumberInput 
                    label="Kit Asciugamani (+)" 
                    min={0} 
                    value={addTowels} 
                    onChange={setAddTowels}
                  />
                  <Button 
                    variant="filled" 
                    color="teal" 
                    onClick={handleRestock} 
                    loading={invLoading}
                  >
                    Conferma Rientro
                  </Button>
                </SimpleGrid>
                
                <Divider label="Azioni Avanzate" labelPosition="center" color="gray.2" />
                
                <Group justify="center">
                  <Button 
                    variant="subtle" 
                    color="gray" 
                    size="xs" 
                    onClick={handleResetInventory}
                    leftSection={<IconRefresh size={14} />}
                  >
                    Rettifica Totali (Override manuale)
                  </Button>
                </Group>
              </Stack>
            </Paper>

            <Text size="xs" c="dimmed" ta="center">
              Ultimo aggiornamento: {dayjs(inventory.lastUpdated?.toDate ? inventory.lastUpdated.toDate() : inventory.lastUpdated).format('DD MMMM [alle] HH:mm')}
            </Text>
          </>
        )}
      </Stack>
    </Container>
  );
}
