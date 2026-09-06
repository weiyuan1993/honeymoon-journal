import { useCallback, useState } from 'react';
import type { UserPermission } from '@/types';
import { GoogleSignInButton } from './AuthButton';

interface TicketReauthenticationProps {
  onReauthenticated(): void;
  onPermissionChange?: (permission: UserPermission) => void;
  buttonClassName: string;
  googleButtonClassName?: string;
}

const COMPACT_GOOGLE_BUTTON_OPTIONS = {
  type: 'icon',
  theme: 'outline',
  size: 'medium',
  shape: 'circle',
};

export default function TicketReauthentication({
  onReauthenticated,
  onPermissionChange,
  buttonClassName,
  googleButtonClassName,
}: TicketReauthenticationProps) {
  const [showGoogleSignIn, setShowGoogleSignIn] = useState(false);
  const handlePermissionChange = useCallback((permission: UserPermission) => {
    onPermissionChange?.(permission);
    onReauthenticated();
    setShowGoogleSignIn(false);
  }, [onPermissionChange, onReauthenticated]);

  if (showGoogleSignIn) {
    return (
      <GoogleSignInButton
        onChange={handlePermissionChange}
        buttonOptions={COMPACT_GOOGLE_BUTTON_OPTIONS}
        className={googleButtonClassName}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setShowGoogleSignIn(true)}
      className={buttonClassName}
      title="重新登入本站"
    >
      重新登入
    </button>
  );
}
