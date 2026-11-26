import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, fetchClient } from '@/api/client';
import { type components, OdooSyncRunStatus } from '@/api/schema';
import { unwrap } from '@/api/unwrap';

export type OdooConnection = components['schemas']['OdooConnectionDto'];
export type OdooSyncRun = components['schemas']['OdooSyncRunDto'];
export type OdooTestResult = components['schemas']['OdooTestConnectionResponseDto'];
export type UpsertOdooRequest = components['schemas']['UpsertOdooConnectionDto'];
export type TestOdooRequest = components['schemas']['TestOdooConnectionDto'];
export type StartOdooSyncRequest = components['schemas']['StartOdooSyncDto'];

const ACTIVE_POLL_INTERVAL_MS = 2_000;

function isRunActive(run: OdooSyncRun | null | undefined): boolean {
  return run?.status === OdooSyncRunStatus.QUEUED || run?.status === OdooSyncRunStatus.RUNNING;
}

export function useOdooConnection(workspaceId: string) {
  return api.useQuery(
    'get',
    '/api/v1/workspaces/{workspaceId}/sources/odoo',
    { params: { path: { workspaceId } } },
    {
      refetchInterval: (query) => {
        const latest = query.state.data?.connection?.latestRun;
        return isRunActive(latest) ? ACTIVE_POLL_INTERVAL_MS : false;
      },
    },
  );
}

export function useTestOdooConnection(workspaceId: string) {
  return useMutation({
    mutationFn: (body: TestOdooRequest): Promise<OdooTestResult> =>
      unwrap(
        fetchClient.POST('/api/v1/workspaces/{workspaceId}/sources/odoo/test', {
          params: { path: { workspaceId } },
          body,
        }),
      ),
  });
}

export function useUpsertOdooConnection(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: UpsertOdooRequest): Promise<OdooConnection> =>
      unwrap(
        fetchClient.PUT('/api/v1/workspaces/{workspaceId}/sources/odoo', {
          params: { path: { workspaceId } },
          body,
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['get', '/api/v1/workspaces/{workspaceId}/sources/odoo'],
      });
    },
  });
}

export function useDisconnectOdooConnection(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (): Promise<OdooConnection> =>
      unwrap(
        fetchClient.DELETE('/api/v1/workspaces/{workspaceId}/sources/odoo', {
          params: { path: { workspaceId } },
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['get', '/api/v1/workspaces/{workspaceId}/sources/odoo'],
      });
    },
  });
}

export function useStartOdooSync(workspaceId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: StartOdooSyncRequest): Promise<OdooSyncRun> =>
      unwrap(
        fetchClient.POST('/api/v1/workspaces/{workspaceId}/sources/odoo/sync', {
          params: { path: { workspaceId } },
          body,
        }),
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['get', '/api/v1/workspaces/{workspaceId}/sources/odoo'],
      });
      void queryClient.invalidateQueries({
        queryKey: ['get', '/api/v1/workspaces/{workspaceId}/products'],
      });
    },
  });
}
