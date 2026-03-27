import { AppShell, Burger, Group, Container, NavLink, Image, ActionIcon, useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { IconLayoutDashboard, IconCalendarPlus, IconSun, IconMoon } from '@tabler/icons-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManageBookings from './pages/ManageBookings';
import ProtectedRoute from './components/ProtectedRoute';

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
      header={{ height: 60 }}
      navbar={{ width: 250, breakpoint: 'sm', collapsed: { mobile: !opened } }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between" align="center">
          <Group gap="sm">
            <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
            <Image
              src="/Logo.jpg"
              h={44}
              w="auto"
              maw={160}
              fit="contain"
            />
          </Group>
          
          <ActionIcon
            onClick={() => setColorScheme(computedColorScheme === 'light' ? 'dark' : 'light')}
            variant="default"
            size="lg"
            aria-label="Toggle color scheme"
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
            style={{ borderRadius: 6 }}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>
        <Container fluid>
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
        <MainLayout>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/gestione" element={<ProtectedRoute adminOnly><ManageBookings /></ProtectedRoute>} />
          </Routes>
        </MainLayout>
      </BrowserRouter>
    </AuthProvider>
  );
}
