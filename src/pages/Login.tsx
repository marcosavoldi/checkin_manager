import { Button, Container, Paper, Title, Text, Center } from '@mantine/core';
import { IconBrandGoogle } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user, loginWithGoogle } = useAuth();

  if (user) {
    return <Navigate to="/" replace />;
  }

  return (
    <Container size={420} my={40}>
      <Title ta="center" order={2}>
        Lazzaretto City Walk
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5} mb={30}>
        Accedi con il tuo account per visualizzare i turni
      </Text>

      <Paper withBorder shadow="md" p={30} mt={30} radius="md">
        <Center>
          <Button 
            leftSection={<IconBrandGoogle size={20} />} 
            variant="default"
            fullWidth
            onClick={loginWithGoogle}
          >
            Accedi con Google
          </Button>
        </Center>
      </Paper>
    </Container>
  );
}
