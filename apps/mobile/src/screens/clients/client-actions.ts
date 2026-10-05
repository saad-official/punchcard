import { canAddClient } from '@punchcard/shared';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { openPaywall } from '@/components/pro-badge';
import { showToast } from '@/components/toast';
import { archiveClient, countActiveClients, deleteClient, getRunningEntry, unarchiveClient, type Client, type Plan } from '@/data';
import * as haptics from '@/native/haptics';

/** "New client", respecting the Free plan's client ceiling. */
export function newClient(plan: Plan) {
  if (canAddClient(plan, countActiveClients())) router.push('/client-editor');
  else {
    haptics.warning();
    openPaywall('clients');
  }
}

export function editClient(client: Pick<Client, 'id'>) {
  router.push({ pathname: '/client-editor', params: { id: client.id } });
}

export function archive(client: Client) {
  if (getRunningEntry()?.clientId === client.id) {
    haptics.warning();
    showToast({ message: `Stop the clock for ${client.name} before archiving` });
    return false;
  }
  archiveClient(client.id);
  haptics.tapLight();
  showToast({ message: `Archived ${client.name}`, actionLabel: 'Undo', onAction: () => unarchiveClient(client.id) });
  return true;
}

/** Unarchiving counts against the Free plan ceiling like a new client. */
export function unarchive(client: Client, plan: Plan) {
  if (!canAddClient(plan, countActiveClients())) {
    haptics.warning();
    openPaywall('clients');
    return;
  }
  unarchiveClient(client.id);
  haptics.tapLight();
  showToast({ message: `${client.name} is active again` });
}

/** Deleting a client is rare and cannot be undone from the UI, so it asks first. */
export function confirmDelete(client: Client, onDeleted?: () => void) {
  if (getRunningEntry()?.clientId === client.id) {
    haptics.warning();
    showToast({ message: `Stop the clock for ${client.name} first` });
    return;
  }
  Alert.alert(
    `Delete ${client.name}?`,
    'The client disappears from lists and pickers. Entries you already logged stay on your timesheets.',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteClient(client.id);
          haptics.warning();
          onDeleted?.();
        },
      },
    ],
  );
}
