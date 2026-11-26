import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { RouterProvider } from 'react-router';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { Toaster } from '@/components/ui/sonner';
import { I18nProvider } from '@/lib/i18n';
import { createAppQueryClient } from './query-client';
import { router } from './router';

const TOAST_MOBILE_BOTTOM_OFFSET = '5.5rem';

export function App() {
  const [queryClient] = useState(createAppQueryClient);

  return (
    <I18nProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
          {/* Clear of the floating save bar on phones. */}
          <Toaster position="bottom-right" mobileOffset={{ bottom: TOAST_MOBILE_BOTTOM_OFFSET }} />
        </QueryClientProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
