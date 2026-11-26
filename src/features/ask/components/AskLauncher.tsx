import { CircleHelp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetTrigger } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useI18n } from '@/lib/i18n';
import { ASK_COPY } from '../ask.constants';
import { useAskConversation } from '../hooks/useAskConversation';
import { AskPanel } from './AskPanel';

/**
 * The Help button in the app header. The conversation lives here, not in the sheet, so it
 * survives closing and reopening the sheet, and a reply still lands if the sheet was closed.
 */
export function AskLauncher() {
  const { t } = useI18n();
  const conversation = useAskConversation();
  const label = t(ASK_COPY.launcher);
  return (
    <Sheet>
      <Tooltip>
        <TooltipTrigger asChild>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={label}>
              <CircleHelp />
            </Button>
          </SheetTrigger>
        </TooltipTrigger>
        <TooltipContent>{label}</TooltipContent>
      </Tooltip>
      <AskPanel {...conversation} />
    </Sheet>
  );
}
