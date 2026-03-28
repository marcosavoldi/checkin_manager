import { AppShell, Burger, Group, Container, NavLink, Image, ActionIcon, useMantineColorScheme, useComputedColorScheme, Text as MantineText, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { BrowserRouter, Routes, Route, useNavigate, useLocation, Navigate } from 'react-router-dom';
import { IconLayoutDashboard, IconCalendarPlus, IconSun, IconMoon, IconHome } from '@tabler/icons-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManageBookings from './pages/ManageBookings';
import Home from './pages/Home';

function ProtectedRoute({ children, adminOnly }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Login />;
  if (adminOnly && user.appRole !== 'admin') {
    return <Navigate to="/home" />;
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
    { label: 'Home', icon: <IconHome size={16} />, path: '/' },
    { label: 'Prenotazioni', icon: <IconLayoutDashboard size={16} />, path: '/prenotazioni' },
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
              h={28}
              fallbackSrc="/appicon.png"
            />
            <MantineText fw={700} size="sm" style={{ letterSpacing: -0.2 }} hiddenFrom="xs">LCW</MantineText>
            <MantineText fw={800} size="md" style={{ letterSpacing: -0.5 }} visibleFrom="xs">
              Lazzaretto City Walk
            </MantineText>
          </Group>
          
          <Group gap={10}>
            <Tooltip label="Home">
              <ActionIcon
                variant="default"
                size="lg"
                onClick={() => navigate('/')}
                radius="md"
              >
                <IconHome size={20} stroke={1.5} />
              </ActionIcon>
            </Tooltip>

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
                <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
                <Route path="/prenotazioni" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/gestione" element={<ProtectedRoute adminOnly><ManageBookings /></ProtectedRoute>} />
                <Route path="*" element={<Navigate to="/" />} />
              </Routes>
            </MainLayout>
          } />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
