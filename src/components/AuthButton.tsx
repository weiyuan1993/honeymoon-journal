import { useEffect, useRef, useState } from 'react';
import type { UserPermission } from '@/types';
import { authClient } from '@/utils/apiClient';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: {
            client_id: string;
            callback(response: { credential: string }): void;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: Record<string, string | number>
          ): void;
        };
      };
    };
  }
}

interface AuthButtonProps {
  permission: UserPermission;
  onChange(permission: UserPermission): void;
}

const loadGoogleIdentity = () =>
  new Promise<void>((resolve, reject) => {
    if (window.google?.accounts.id) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-google-identity]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Google 登入載入失敗')), {
        once: true,
      });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.dataset.googleIdentity = 'true';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Google 登入載入失敗'));
    document.head.appendChild(script);
  });

export default function AuthButton({ permission, onChange }: AuthButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (permission.canEdit) return;
    let cancelled = false;
    const setup = async () => {
      try {
        const config = await authClient.getConfig();
        if (!config.enabled || !config.clientId) return;
        await loadGoogleIdentity();
        if (cancelled || !buttonRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: config.clientId,
          callback: async ({ credential }) => {
            setBusy(true);
            setError('');
            try {
              onChange(await authClient.login(credential));
            } catch (loginError) {
              setError(loginError instanceof Error ? loginError.message : '此帳號沒有權限');
            } finally {
              setBusy(false);
            }
          },
        });
        buttonRef.current.replaceChildren();
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'medium',
          text: 'signin_with',
          shape: 'pill',
        });
      } catch (setupError) {
        setError(setupError instanceof Error ? setupError.message : 'Google 登入無法使用');
      }
    };
    setup();
    return () => {
      cancelled = true;
    };
  }, [permission.canEdit, onChange]);

  if (permission.canEdit) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            onChange(await authClient.logout());
          } finally {
            setBusy(false);
          }
        }}
        className="w-full px-4 py-2.5 text-left text-sm font-serif text-ink hover:bg-gold/10"
      >
        登出 {permission.email}
      </button>
    );
  }

  return (
    <div className="px-3 py-2">
      <div ref={buttonRef} className={busy ? 'pointer-events-none opacity-60' : ''} />
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}
    </div>
  );
}
