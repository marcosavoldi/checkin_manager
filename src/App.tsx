import { AppShell, Burger, Group, Container, NavLink, Image, ActionIcon, useMantineColorScheme, useComputedColorScheme, Text as MantineText } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { IconLayoutDashboard, IconCalendarPlus, IconSun, IconMoon } from '@tabler/icons-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManageBookings from './pages/ManageBookings';

function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Login />;
  if (adminOnly && user.appRole !== 'admin') {
    return <Dashboard />;
  }
  return <>{children}</>;
}

function MainLayout({ children }: { children: React.ReactNode }) {
  const [opened, { toggle, close }] = useDisclosure();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  
  if (!user || loading) return <>{children}</>;

  const navItems = [
    { label: 'Dashboard', icon: <IconLayoutDashboard size={16} />, path: '/' },
    ...(user.appRole === 'admin'
      ? [{ label: 'Gestione Prenotazioni', icon: <IconCalendarPlus size={16} />, path: '/gestione' }]
      : [])
  ];

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 280, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" align="center">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Image
              src={computedColorScheme === 'light' ? '/Logo.jpg' : '/Logo1.png'}
              h={44}
              w="auto"
              fit="contain"
            />
            <MantineText fw={700} size="lg" visibleFrom="xs">Lazzaretto City Walk</MantineText>
          </Group>
          
          <ActionIcon
            onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
            variant="default"
            size="lg"
            radius="md"
          >
            {computedColorScheme === 'light' ? (
              <IconMoon stroke={1.5} size={20} />
            ) : (
              <IconSun stroke={1.5} size={20} />
            )}
          </ActionIcon>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        {navItems.map(item => (
          <NavLink
            key={item.path}
            label={item.label}
            leftSection={item.icon}
            active={location.pathname === item.path}
            onClick={() => { navigate(item.path); close(); }}
            style={{ borderRadius: 8, marginBottom: 4 }}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Container size="xl" py="md">
          {children}
        </Container>
      </AppShell.Main>
    </AppShell>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <MainLayout>
              <Routes>
                <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/gestione" element={<ProtectedRoute adminOnly><ManageBookings /></ProtectedRoute>} />
              </Routes>
            </MainLayout>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
