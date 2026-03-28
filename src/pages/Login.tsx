import { useState } from 'react';
import { 
  Button, Container, Paper, Title, Text, 
  Tabs, TextInput, PasswordInput, Stack, Alert
} from '@mantine/core';
import { IconBrandGoogle, IconLock, IconUser, IconAlertCircle, IconUserShield, IconUsers } from '@tabler/icons-react';
import { useAuth } from '../context/AuthContext';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user, loginWithGoogle, loginWithEmail, error, setError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err) {
      // Error is handled in context
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container size={420} my={80}>
      <Title ta="center" fw={900} size={32} style={{ letterSpacing: -1 }}>
        Lazzaretto City Walk
      </Title>
      <Text c="dimmed" size="sm" ta="center" mt={5}>
        Gestione Integrata Check-in & Biancheria
      </Text>

      <Paper withBorder shadow="xl" p={30} mt={30} radius="lg" style={{ overflow: 'hidden' }}>
        {error && (
          <Alert icon={<IconAlertCircle size={16} />} color="red" variant="light" mb="lg" radius="md" withCloseButton onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Tabs defaultValue="staff" variant="pills" radius="md" color="blue">
          <Tabs.List grow mb="xl">
            <Tabs.Tab value="staff" leftSection={<IconUsers size={14} />}>Staff</Tabs.Tab>
            <Tabs.Tab value="admin" leftSection={<IconUserShield size={14} />}>Admin</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="staff">
            <form onSubmit={handleEmailLogin}>
              <Stack>
                <TextInput
                  label="Email Staff"
                  placeholder="staff@lazzaretto.it"
                  required
                  leftSection={<IconUser size={16} />}
                  value={email}
                  onChange={(e) => setEmail(e.currentTarget.value)}
                  radius="md"
                />
                <PasswordInput
                  label="Password"
                  placeholder="La tua password"
                  required
                  leftSection={<IconLock size={16} />}
                  value={password}
                  onChange={(e) => setPassword(e.currentTarget.value)}
                  radius="md"
                />
                <Button type="submit" fullWidth mt="md" radius="md" loading={loading}>
                  Accedi
                </Button>
              </Stack>
            </form>
          </Tabs.Panel>

          <Tabs.Panel value="admin">
            <Stack align="center" py="xl">
              <Text size="sm" c="dimmed" ta="center">
                Accesso riservato agli amministratori autorizzati tramite Google.
              </Text>
              <Button 
                leftSection={<IconBrandGoogle size={20} />} 
                variant="default"
                fullWidth
                onClick={loginWithGoogle}
                radius="md"
                size="md"
              >
                Accedi con Google
              </Button>
            </Stack>
          </Tabs.Panel>
        </Tabs>
      </Paper>
      
      <Text ta="center" size="xs" c="dimmed" mt="xl">
        In caso di smarrimento credenziali, contatta l'amministratore.
      </Text>
    </Container>
  );
}
