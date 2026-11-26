import { Link, useLocation } from 'react-router';
import { ROUTES } from '@/config/routes';
import { AuthCard, useAuthNavigationState, SignInForm } from '@/features/auth';
import { useI18n } from '@/lib/i18n';

export function SignInPage() {
  const { t } = useI18n();
  // Keeps where to go next, such as an invitation, when switching between the two forms.
  const navigationState = useAuthNavigationState();
  // Keeps an AI agent's signed authorization query, so its sign-in continues either way.
  const { search } = useLocation();
  return (
    <AuthCard
      title={t('Sign in')}
      description={t('Welcome back to Crossmart.')}
      footer={
        <p>
          {t('New to Crossmart?')}{' '}
          <Link
            to={{ pathname: ROUTES.signUp, search }}
            state={navigationState}
            className="font-medium text-foreground underline"
          >
            {t('Create an account')}
          </Link>
        </p>
      }
    >
      <SignInForm />
    </AuthCard>
  );
}
