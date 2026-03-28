import { useState, useEffect } from 'react';
import { 
  Title, Text, Button, Group, Stack, Card, 
  ActionIcon, Modal, TextInput, PasswordInput,
  Paper, ThemeIcon
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
    <Stack gap="xl">
      <Group justify="space-between">
        <div>
          <Title order={2} fw={800}>Gestione Accessi</Title>
          <Text size="sm" c="dimmed">Gestisci chi può accedere all'applicazione.</Text>
        </div>
      </Group>

      {/* --- Sezione Admin Whitelist --- */}
      <Card withBorder radius="lg" p="xl" shadow="sm">
        <Group justify="space-between" mb="lg">
          <Group gap="sm">
            <ThemeIcon color="violet" size="lg" radius="md" variant="light">
              <IconShieldCheck size={20} />
            </ThemeIcon>
            <div>
              <Text fw={700}>Admin Autorizzati (Whitelist Google)</Text>
              <Text size="xs" c="dimmed">Solo questi indirizzi Gmail potranno loggarsi come Admin.</Text>
            </div>
          </Group>
          <Button variant="light" size="sm" onClick={openAdmin} radius="md">Aggiungi Admin</Button>
        </Group>

        <Stack gap="xs">
          {admins.map(a => (
            <Paper key={a.id} withBorder p="sm" radius="md">
              <Group justify="space-between">
                <Group gap="sm">
                  <IconMail size={16} color="var(--mantine-color-dimmed)" />
                  <Text size="sm" fw={500}>{a.email}</Text>
                </Group>
                <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteAdmin(a.id)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
          {admins.length === 0 && <Text size="sm" c="dimmed" ta="center" py="md">Nessun admin autorizzato. Aggiungi il tuo email!</Text>}
        </Stack>
      </Card>

      {/* --- Sezione Staff --- */}
      <Card withBorder radius="lg" p="xl" shadow="sm">
        <Group justify="space-between" mb="lg">
          <Group gap="sm">
            <ThemeIcon color="blue" size="lg" radius="md" variant="light">
              <IconUserCircle size={20} />
            </ThemeIcon>
            <div>
              <Text fw={700}>Accrediti Staff</Text>
              <Text size="xs" c="dimmed">Personale autorizzato con Email e Password.</Text>
            </div>
          </Group>
          <Button leftSection={<IconUserPlus size={16} />} onClick={open} radius="md">Crea Staff</Button>
        </Group>

        <Stack gap="xs">
          {staff.map(s => (
            <Paper key={s.id} withBorder p="md" radius="md">
              <Group justify="space-between">
                <div>
                  <Text fw={600} size="sm">{s.name}</Text>
                  <Text size="xs" c="dimmed">{s.email}</Text>
                </div>
                <ActionIcon variant="subtle" color="red" onClick={() => handleDeleteStaff(s.id, s.email)}>
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Paper>
          ))}
          {staff.length === 0 && <Text size="sm" c="dimmed" ta="center" py="md">Nessun membro dello staff configurato.</Text>}
        </Stack>
      </Card>

      {/* --- Modale Aggiungi Staff --- */}
      <Modal opened={opened} onClose={close} title="Crea Nuovo Account Staff" centered radius="lg">
        <Stack gap="md">
          <TextInput 
            label="Nome Staff" 
            placeholder="es. Mario Rossi" 
            required
            value={newStaff.name}
            onChange={(e) => setNewStaff(s => ({ ...s, name: e.currentTarget.value }))}
          />
          <TextInput 
            label="Email/Username" 
            placeholder="mario@lazzaretto.it" 
            required 
            leftSection={<IconMail size={16} />}
            value={newStaff.email}
            onChange={(e) => setNewStaff(s => ({ ...s, email: e.currentTarget.value }))}
          />
          <PasswordInput 
            label="Password iniziale" 
            placeholder="Scegli una password sicura" 
            required 
            leftSection={<IconLock size={16} />}
            value={newStaff.password}
            onChange={(e) => setNewStaff(s => ({ ...s, password: e.currentTarget.value }))}
          />
          <Button fullWidth onClick={handleAddStaff} loading={saving} mt="md" radius="md">Crea Account</Button>
        </Stack>
      </Modal>

      {/* --- Modale Aggiungi Admin --- */}
      <Modal opened={adminOpened} onClose={closeAdmin} title="Autorizza Admin Gmail" centered radius="lg">
        <Stack gap="md">
          <TextInput 
            label="Gmail Admin" 
            placeholder="nome@gmail.com" 
            required 
            leftSection={<IconBrandGoogle size={16} />}
            value={newAdminEmail}
            onChange={(e) => setNewAdminEmail(e.currentTarget.value)}
          />
          <Button fullWidth onClick={handleAddAdmin} loading={saving} mt="md" radius="md" color="violet">Autorizza</Button>
        </Stack>
      </Modal>
    </Stack>
  );
}
