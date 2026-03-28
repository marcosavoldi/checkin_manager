import { useState, useEffect } from 'react';
import { 
  Title, Text, Button, Group, Stack, 
  ActionIcon, Modal, TextInput, PasswordInput,
  Paper, ThemeIcon, Container, Box
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { 
  IconTrash, IconMail, IconLock, 
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
    <Container size="md" py="md" px="xs">
      <Stack gap="md">
        <Box mb={5}>
          <Title order={2} fw={900} size={28} style={{ letterSpacing: -1 }}>
            Gestione Accessi
          </Title>
        </Box>

        {/* --- Sezione Admin Whitelist --- */}
        <Paper withBorder radius="lg" p="md" shadow="sm" style={{ 
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          borderColor: 'rgba(255, 255, 255, 0.1)' 
        }}>
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <ThemeIcon color="violet" size="md" radius="sm" variant="light">
                <IconShieldCheck size={18} />
              </ThemeIcon>
              <Text fw={700} size="sm">Admin Authorized</Text>
            </Group>
            <Button 
              variant="light" 
              color="violet" 
              size="compact-xs" 
              onClick={openAdmin} 
              radius="sm"
            >
              Add
            </Button>
          </Group>

          <Stack gap={5}>
            {admins.map((a: AuthorizedAdmin) => (
              <Box 
                key={a.id} 
                p={8} 
                style={{ 
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <Group justify="space-between">
                  <Text size="xs" fw={500} truncate>{a.email}</Text>
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDeleteAdmin(a.id)}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Box>
            ))}
            {admins.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" py="xs">No admins whitelisted.</Text>
            )}
          </Stack>
        </Paper>

        {/* --- Sezione Staff --- */}
        <Paper withBorder radius="lg" p="md" shadow="sm" style={{ 
          background: 'rgba(255, 255, 255, 0.03)',
          backdropFilter: 'blur(10px)',
          borderColor: 'rgba(255, 255, 255, 0.1)' 
        }}>
          <Group justify="space-between" mb="md">
            <Group gap="xs">
              <ThemeIcon color="blue" size="md" radius="sm" variant="light">
                <IconUserCircle size={18} />
              </ThemeIcon>
              <Text fw={700} size="sm">Accrediti Staff</Text>
            </Group>
            <Button 
              variant="filled" 
              color="blue" 
              size="compact-xs" 
              onClick={open} 
              radius="sm"
            >
              Crea
            </Button>
          </Group>

          <Stack gap={5}>
            {staff.map((s: StaffUser) => (
              <Box 
                key={s.id} 
                p={8} 
                style={{ 
                  borderRadius: '8px',
                  background: 'rgba(0, 0, 0, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.05)'
                }}
              >
                <Group justify="space-between" wrap="nowrap">
                  <Box style={{ overflow: 'hidden' }}>
                    <Text fw={600} size="xs" truncate>{s.name}</Text>
                    <Text size="10px" c="dimmed" truncate>{s.email}</Text>
                  </Box>
                  <ActionIcon variant="subtle" color="red" size="sm" onClick={() => handleDeleteStaff(s.id, s.email)}>
                    <IconTrash size={14} />
                  </ActionIcon>
                </Group>
              </Box>
            ))}
            {staff.length === 0 && (
              <Text size="xs" c="dimmed" ta="center" py="xs">No staff accounts configured.</Text>
            )}
          </Stack>
        </Paper>

        {/* --- Modale Aggiungi Staff --- */}
        <Modal opened={opened} onClose={close} title="Nuovo Collaboratore" centered radius="lg" size="sm" overlayProps={{ blur: 10 }}>
          <Stack gap="sm">
            <TextInput 
              label="Nome" 
              placeholder="es. Mario Rossi" 
              size="sm"
              required
              value={newStaff.name}
              onChange={(e) => setNewStaff((prev) => ({ ...prev, name: e.currentTarget.value }))}
              radius="md"
            />
            <TextInput 
              label="Email / Login" 
              placeholder="mario@lazzaretto.it" 
              size="sm"
              required 
              leftSection={<IconMail size={14} />}
              value={newStaff.email}
              onChange={(e) => setNewStaff((prev) => ({ ...prev, email: e.currentTarget.value }))}
              radius="md"
            />
            <PasswordInput 
              label="Password iniziale" 
              placeholder="Minimo 6 caratteri" 
              size="sm"
              required 
              leftSection={<IconLock size={14} />}
              value={newStaff.password}
              onChange={(e) => setNewStaff((prev) => ({ ...prev, password: e.currentTarget.value }))}
              radius="md"
            />
            <Button fullWidth onClick={handleAddStaff} loading={saving} mt="md" radius="md" size="sm">
              Crea Account
            </Button>
          </Stack>
        </Modal>

        {/* --- Modale Aggiungi Admin --- */}
        <Modal opened={adminOpened} onClose={closeAdmin} title="Autorizza Admin Gmail" centered radius="lg" size="sm" overlayProps={{ blur: 10 }}>
          <Stack gap="sm">
            <TextInput 
              label="Indirizzo Gmail" 
              placeholder="utente@gmail.com" 
              size="sm"
              required 
              leftSection={<IconBrandGoogle size={14} />}
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.currentTarget.value)}
              radius="md"
            />
            <Button fullWidth onClick={handleAddAdmin} loading={saving} mt="md" radius="md" size="sm" color="violet">
              Autorizza
            </Button>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
}
