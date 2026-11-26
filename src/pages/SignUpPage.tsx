import { Link, useLocation } from 'react-router';
import { ROUTES } from '@/config/routes';
import { AuthCard, useAuthNavigationState, SignUpForm } from '@/features/auth';
import { useI18n } from '@/lib/i18n';

export function SignUpPage() {
  const { t } = useI18n();
  // Keeps where to go next, such as an invitation, when switching between the two forms.
  const navigationState = useAuthNavigationState();
  // Keeps an AI agent's signed authorization query, so its sign-in continues either way.
  const { search } = useLocation();
  return (
    <AuthCard
      title={t('Create your account')}
      description={t('One catalog for every store you sell on.')}
      footer={
        <p>
          {t('Already have an account?')}{' '}
          <Link
            to={{ pathname: ROUTES.signIn, search }}
            state={navigationState}
            className="font-medium text-foreground underline"
          >
            {t('Sign in')}
          </Link>
        </p>
      }
    >
      <SignUpForm />
    </AuthCard>
  );
}
