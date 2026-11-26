import { Link } from 'react-router';
import { ROUTES } from '@/config/routes';
import { AuthCard, ForgotPasswordForm } from '@/features/auth';
import { useI18n } from '@/lib/i18n';

export function ForgotPasswordPage() {
  const { t } = useI18n();
  return (
    <AuthCard
      title={t('Reset your password')}
      description={t('Enter your email and we will send you a link to choose a new password.')}
      footer={
        <p>
          {t('Remembered it?')}{' '}
          <Link to={ROUTES.signIn} className="font-medium text-foreground underline">
            {t('Sign in')}
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm />
    </AuthCard>
  );
}
