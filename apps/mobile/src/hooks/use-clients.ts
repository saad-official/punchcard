import { listClients, listJobs } from '@/data/clients-repo';
import { useLiveQuery } from '@/data/store';
import type { Client, Job } from '@/data/types';

const EMPTY_CLIENTS: Client[] = [];
const EMPTY_JOBS: Job[] = [];

/** Active clients sorted by name (`includeArchived` adds archived ones). Re-renders on client writes. */
export function useClients(opts: { includeArchived?: boolean } = {}): Client[] {
  const includeArchived = opts.includeArchived ?? false;
  return useLiveQuery(`clients:${includeArchived}`, ['clients'], () => listClients({ includeArchived }), EMPTY_CLIENTS);
}

/** One client by id (archived included), or null. */
export function useClient(id: string | null | undefined): Client | null {
  const all = useClients({ includeArchived: true });
  return all.find((c) => c.id === id) ?? null;
}

/** Active jobs of a client. */
export function useJobs(clientId: string | null | undefined): Job[] {
  return useLiveQuery(
    `jobs:${clientId ?? ''}`,
    ['jobs'],
    () => (clientId ? listJobs(clientId) : EMPTY_JOBS),
    EMPTY_JOBS,
  );
}
