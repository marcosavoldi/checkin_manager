import { Center, Text, Stack, Button, ThemeIcon } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export default function ErrorState({ title = 'Errore imprevisto', message, onRetry }: ErrorStateProps) {
  return (
    <Center h="100%" mih={300}>
      <Stack align="center" ta="center" maw={400}>
        <ThemeIcon size={64} radius="xl" color="red" variant="light">
          <IconAlertCircle size={40} />
        </ThemeIcon>
        <Text fw={700} size="xl">{title}</Text>
        <Text c="dimmed">{message}</Text>
        {onRetry && (
          <Button mt="md" variant="outline" onClick={onRetry}>
            Riprova
          </Button>
        )}
      </Stack>
    </Center>
  );
}
