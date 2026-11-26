import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useI18n } from '@/lib/i18n';

interface ReleaseReservationDialogProps {
  workspaceId: string;
  orderId: string;
  orderName: string;
  commercialStatus: string;
  reservedUnits: number;
  productSummary: string;
}

export function ReleaseReservationDialog({
  workspaceId,
  orderId,
  orderName,
  commercialStatus,
  reservedUnits,
  productSummary,
}: ReleaseReservationDialogProps) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/v1/workspaces/${workspaceId}/orders/${orderId}/release-reservation`,
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success(t('Reservation released manually'));
      setOpen(false);
      setReason('');
      void queryClient.invalidateQueries({
        queryKey: ['get', '/api/v1/workspaces/{workspaceId}/orders/{orderId}'],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message || t('Could not release reservation'));
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <AlertTriangle className="mr-1.5 size-3.5 text-amber-500" />
          {t('Release reservation')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('Emergency reservation release')}</DialogTitle>
          <DialogDescription>
            {t('This action releases held inventory for this order without cancelling the marketplace purchase or Odoo sale order.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="rounded-md border bg-muted/40 p-3 space-y-1 text-xs">
            <p>
              <strong>{t('Order')}:</strong> {orderName}
            </p>
            <p>
              <strong>{t('Commercial status')}:</strong> {commercialStatus}
            </p>
            <p>
              <strong>{t('Reserved quantity')}:</strong> {reservedUnits}
            </p>
            <p>
              <strong>{t('Products')}:</strong> {productSummary}
            </p>
          </div>

          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300">
            {t('Automatic re-reservation will be locked until an authorized operator explicitly restores it.')}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="release-reason">{t('Reason (required)')}</Label>
            <Textarea
              id="release-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t('Explain why this reservation is being released manually...')}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button
            variant="destructive"
            disabled={reason.trim().length < 3 || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? t('Releasing...') : t('Confirm release')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
