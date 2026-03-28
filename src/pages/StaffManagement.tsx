import { useState, useEffect } from 'react';
import { 
  Title, Text, Button, Group, Stack, 
  ActionIcon, Modal, TextInput, PasswordInput,
  Paper, ThemeIcon, Container, Box, Tooltip
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconUserPlus, IconTrash, IconMail, IconLock, 
  IconShieldCheck, IconUserCircle, IconBrandGoogle 
} from '@tabler/icons-react';
import { 
  collection, getDocs, deleteDoc, doc, addDoc, 
  query, where, serverTimestamp 
} from 'firebase/firestore';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { db } from '../lib/firebase';

// We need the config to create a secondary app for staff creation
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthorizedAdmin {
  id: string;
  email: string;
}

export default function StaffManagement() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [admins, setAdmins] = useState<AuthorizedAdmin[]>([]);
  const [opened, { open, close }] = useDisclosure(false);
  const [adminOpened, { open: openAdmin, close: closeAdmin }] = useDisclosure(false);
  const [saving, setSaving] = useState(false);

  const [newStaff, setNewStaff] = useState({ name: '', email: '', password: '' });
  const [newAdminEmail, setNewAdminEmail] = useState('');

  const loadData = async () => {
    try {
      const staffSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'user')));
      setStaff(staffSnap.docs.map(d => ({ id: d.id, ...d.data() } as StaffUser)));

      const adminSnap = await getDocs(collection(db, 'authorized_admins'));
      setAdmins(adminSnap.docs.map(d => ({ id: d.id, ...d.data() } as AuthorizedAdmin)));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleAddStaff = async () => {
    if (!newStaff.email || !newStaff.password) return;
    setSaving(true);
    let secondaryApp;
    try {
      // Create user in Auth without logging out current user
      secondaryApp = initializeApp(firebaseConfig, 'Secondary');
      const secondaryAuth = getAuth(secondaryApp);
      const userCredential = await createUserWithEmailAndPassword(secondaryAuth, newStaff.email, newStaff.password);
      const uid = userCredential.user.uid;

      // Create doc in Firestore
      await addDoc(collection(db, 'users'), {
        uid,
        name: newStaff.name || newStaff.email.split('@')[0],
        email: newStaff.email,
        role: 'user',
        createdAt: serverTimestamp()
      });

      close();
      setNewStaff({ name: '', email: '', password: '' });
      await loadData();
    } catch (err: any) {
      alert('Errore: ' + err.message);
    } finally {
      if (secondaryApp) await deleteApp(secondaryApp);
      setSaving(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail) return;
    setSaving(true);
    try {
      await addDoc(collection(db, 'authorized_admins'), {
        email: newAdminEmail.toLowerCase(),
        createdAt: serverTimestamp()
      });
      closeAdmin();
      setNewAdminEmail('');
      await loadData();
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStaff = async (id: string, email: string) => {
    if (!confirm(`Vuoi eliminare definitivamente l'accesso di ${email}?`)) return;
    try {
      await deleteDoc(doc(db, 'users', id));
      // Note: We can only delete Auth user from Admin SDK/Cloud Functions.
      // Here we just remove the Firestore entry which will effectively block them if we check role.
      // Or we can tell the user they need to manually delete from Firebase Console for now.
      await loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteAdmin = async (id: string) => {
    if (!confirm(`Vuoi revocare l'autorizzazione admin?`)) return;
    await deleteDoc(doc(db, 'authorized_admins', id));
    await loadData();
  };

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Box mb="md">
          <Title order={1} fw={900} size={38} style={{ letterSpacing: -1.5 }}>
            Gestione Accessi
          </Title>
          <Text c="dimmed" size="sm">
            Amministra il personale e le autorizzazioni di sicurezza.
          </Text>
        </Box>

        {/* --- Sezione Admin Whitelist --- */}
        <Paper withBorder radius="xl" p="xl" shadow="sm" style={{ 
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          borderColor: 'rgba(255, 255, 255, 0.1)' 
        }}>
          <Group justify="space-between" mb="xl">
            <Group gap="md">
              <ThemeIcon color="violet" size={48} radius="lg" variant="filled">
                <IconShieldCheck size={28} />
              </ThemeIcon>
              <div>
                <Text fw={800} size="lg">Admin Autorizzati</Text>
                <Text size="xs" c="dimmed">Whitelist Gmail per accesso Google</Text>
              </div>
            </Group>
            <Button 
              variant="white" 
              color="violet" 
              size="sm" 
              onClick={openAdmin} 
              radius="md"
              leftSection={<IconUserPlus size={16} />}
            >
              Aggiungi Admin
            </Button>
          </Group>

          <Stack gap="sm">
            {admins.map(a => (
              <Box 
                key={a.id} 
                p="md" 
                style={{ 
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <Group justify="space-between">
                  <Group gap="md">
                    <ThemeIcon color="violet" variant="light" size="sm">
                      <IconMail size={14} />
                    </ThemeIcon>
                    <Text size="sm" fw={600}>{a.email}</Text>
                  </Group>
                  <Tooltip label="Revoca autorizzazione">
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteAdmin(a.id)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Box>
            ))}
            {admins.length === 0 && (
              <Paper withBorder p="xl" radius="lg" style={{ borderStyle: 'dashed', background: 'transparent' }}>
                <Text size="sm" c="dimmed" ta="center">Nessun admin autorizzato. Aggiungi il tuo email!</Text>
              </Paper>
            )}
          </Stack>
        </Paper>

        {/* --- Sezione Staff --- */}
        <Paper withBorder radius="xl" p="xl" shadow="sm" style={{ 
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          borderColor: 'rgba(255, 255, 255, 0.1)' 
        }}>
          <Group justify="space-between" mb="xl">
            <Group gap="md">
              <ThemeIcon color="blue" size={48} radius="lg" variant="filled">
                <IconUserCircle size={28} />
              </ThemeIcon>
              <div>
                <Text fw={800} size="lg">Accrediti Staff</Text>
                <Text size="xs" c="dimmed">Accesso tramite Email e Password</Text>
              </div>
            </Group>
            <Button 
              variant="filled" 
              color="blue" 
              size="sm" 
              onClick={open} 
              radius="md"
              leftSection={<IconUserPlus size={16} />}
            >
              Crea Staff
            </Button>
          </Group>

          <Stack gap="sm">
            {staff.map(s => (
              <Box 
                key={s.id} 
                p="md" 
                style={{ 
                  borderRadius: '12px',
                  background: 'rgba(0, 0, 0, 0.2)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <Group justify="space-between">
                  <Group gap="md">
                    <ThemeIcon color="blue" variant="light" size="sm">
                      <IconUserCircle size={14} />
                    </ThemeIcon>
                    <div>
                      <Text fw={700} size="sm">{s.name}</Text>
                      <Text size="xs" c="dimmed">{s.email}</Text>
                    </div>
                  </Group>
                  <Tooltip label="Elimina account">
                    <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteStaff(s.id, s.email)}>
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Tooltip>
                </Group>
              </Box>
            ))}
            {staff.length === 0 && (
              <Paper withBorder p="xl" radius="lg" style={{ borderStyle: 'dashed', background: 'transparent' }}>
                <Text size="sm" c="dimmed" ta="center">Nessun membro dello staff configurato.</Text>
              </Paper>
            )}
          </Stack>
        </Paper>

        {/* --- Modale Aggiungi Staff --- */}
        <Modal opened={opened} onClose={close} title="Nuovo Collaboratore" centered radius="xl" overlayProps={{ blur: 10 }}>
          <Stack gap="md">
            <TextInput 
              label="Nome" 
              placeholder="es. Mario Rossi" 
              required
              value={newStaff.name}
              onChange={(e) => setNewStaff(s => ({ ...s, name: e.currentTarget.value }))}
              radius="md"
            />
            <TextInput 
              label="Email / Login" 
              placeholder="mario@lazzaretto.it" 
              required 
              leftSection={<IconMail size={16} />}
              value={newStaff.email}
              onChange={(e) => setNewStaff(s => ({ ...s, email: e.currentTarget.value }))}
              radius="md"
              description="Verrà usata come nome utente per il login"
            />
            <PasswordInput 
              label="Password iniziale" 
              placeholder="Minimo 6 caratteri" 
              required 
              leftSection={<IconLock size={16} />}
              value={newStaff.password}
              onChange={(e) => setNewStaff(s => ({ ...s, password: e.currentTarget.value }))}
              radius="md"
            />
            <Button fullWidth onClick={handleAddStaff} loading={saving} mt="lg" radius="md" size="md">
              Crea Account
            </Button>
          </Stack>
        </Modal>

        {/* --- Modale Aggiungi Admin --- */}
        <Modal opened={adminOpened} onClose={closeAdmin} title="Autorizza Admin Gmail" centered radius="xl" overlayProps={{ blur: 10 }}>
          <Stack gap="md">
            <TextInput 
              label="Indirizzo Gmail" 
              placeholder="utente@gmail.com" 
              required 
              leftSection={<IconBrandGoogle size={16} />}
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.currentTarget.value)}
              radius="md"
              description="Assicurati che sia un indirizzo Gmail valido"
            />
            <Button fullWidth onClick={handleAddAdmin} loading={saving} mt="lg" radius="md" size="md" color="violet">
              Autorizza Accesso
            </Button>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
