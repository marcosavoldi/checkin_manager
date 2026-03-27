import { Center, Loader as MantineLoader, Text, Stack } from '@mantine/core';

export default function Loader({ message = 'Caricamento in corso...' }: { message?: string }) {
  return (
    <Center h="100%" mih={200}>
      <Stack align="center">
        <MantineLoader size="xl" type="dots" />
        <Text c="dimmed" mt="md">{message}</Text>
      </Stack>
    </Center>
  );
}
