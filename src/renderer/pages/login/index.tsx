import loginLogo from '@renderer/assets/logos/brand/app.png';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '@/renderer/services/i18n';
import { SUPPORTED_LANGUAGES } from '@/common/config/i18n';
import { useNavigate } from 'react-router-dom';
import AppLoader from '@renderer/components/layout/AppLoader';
import { useAuth } from '../../hooks/context/AuthContext';
import BinaryGrass from './BinaryGrass';
import './LoginPage.css';

type MessageState = {
  type: 'error' | 'success';
  text: string;
};

const REMEMBER_ME_KEY = 'rememberMe';
const REMEMBERED_EMAIL_KEY = 'rememberedEmail';

const deobfuscate = (text: string): string => {
  try {
    // Try direct base64 decode first (new format)
    return decodeURIComponent(atob(text));
  } catch {
    try {
      // Fall back to reversed base64 (legacy format)
      const reversed = text.split('').toReversed().join('');
      return decodeURIComponent(atob(reversed));
    } catch {
      return '';
    }
  }
};

/** Google SVG logo for the OAuth button */
const GoogleIcon: React.FC = () => (
  <svg className='login-page__google-icon' viewBox='0 0 24 24' aria-hidden='true'>
    <path
      d='M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z'
      fill='#4285F4'
    />
    <path
      d='M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'
      fill='#34A853'
    />
    <path
      d='M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84z'
      fill='#FBBC05'
    />
    <path
      d='M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'
      fill='#EA4335'
    />
  </svg>
);

const LoginPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { status, login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [loading, setLoading] = useState(false);

  const emailRef = useRef<HTMLInputElement | null>(null);
  const messageTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    document.body.classList.add('login-page-active');
    return () => {
      document.body.classList.remove('login-page-active');
      if (messageTimer.current) {
        window.clearTimeout(messageTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    document.title = t('login.pageTitle');
  }, [t]);

  useEffect(() => {
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  useEffect(() => {
    const isRememberMe = localStorage.getItem(REMEMBER_ME_KEY) === 'true';
    if (isRememberMe) {
      const storedEmail = localStorage.getItem(REMEMBERED_EMAIL_KEY);
      if (storedEmail) setEmail(deobfuscate(storedEmail));
      setRememberMe(true);
    }
    window.setTimeout(() => {
      emailRef.current?.focus();
    }, 0);

    return () => {
      if (messageTimer.current) {
        window.clearTimeout(messageTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      void navigate('/guid', { replace: true });
    }
  }, [navigate, status]);

  const clearMessageLater = useCallback(() => {
    if (messageTimer.current) {
      window.clearTimeout(messageTimer.current);
    }
    messageTimer.current = window.setTimeout(() => {
      setMessage((prev) => (prev?.type === 'success' ? prev : null));
    }, 5000);
  }, []);

  const showMessage = useCallback(
    (next: MessageState) => {
      setMessage(next);
      if (next.type === 'error') {
        clearMessageLater();
      }
    },
    [clearMessageLater]
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmedEmail = email.trim();

      if (!trimmedEmail || !password) {
        showMessage({ type: 'error', text: t('login.errors.empty') });
        return;
      }

      setLoading(true);
      setMessage(null);

      // Auth backend expects `username` field — email is sent as username
      const result = await login({ username: trimmedEmail, password, remember: rememberMe });

      if (result.success) {
        if (rememberMe) {
          localStorage.setItem(REMEMBER_ME_KEY, 'true');
          localStorage.setItem(REMEMBERED_EMAIL_KEY, btoa(encodeURIComponent(trimmedEmail)));
        } else {
          localStorage.removeItem(REMEMBER_ME_KEY);
          localStorage.removeItem(REMEMBERED_EMAIL_KEY);
        }

        const successText = t('login.success');
        showMessage({ type: 'success', text: successText });

        window.setTimeout(() => {
          void navigate('/guid', { replace: true });
        }, 600);
      } else {
        const errorText = (() => {
          switch (result.code) {
            case 'invalidCredentials':
              return t('login.errors.invalidCredentials');
            case 'tooManyAttempts':
              return t('login.errors.tooManyAttempts');
            case 'networkError':
              return t('login.errors.networkError');
            case 'serverError':
              return t('login.errors.serverError');
            case 'unknown':
            default:
              return result.message ?? t('login.errors.unknown');
          }
        })();

        showMessage({ type: 'error', text: errorText });
      }

      setLoading(false);
    },
    [login, navigate, password, rememberMe, showMessage, t, email]
  );

  if (status === 'checking') {
    return <AppLoader />;
  }

  return (
    <div className='login-page'>
      <BinaryGrass />

      <div className='login-page__card'>
        <div className='login-page__header'>
          <div className='login-page__logo'>
            <img src='/logargo.png' alt={t('login.brand')} />
          </div>
          <h1 className='login-page__title'>{t('login.brand')}</h1>
          <p className='login-page__subtitle'>{t('login.subtitle')}</p>
        </div>

        <form className='login-page__form' onSubmit={handleSubmit}>
          <div className='login-page__form-item'>
            <label className='login-page__label' htmlFor='email'>
              {t('login.email')}
            </label>
            <div className='login-page__input-wrapper'>
              <svg
                className='login-page__input-icon'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                aria-hidden='true'
              >
                <rect x='2' y='4' width='20' height='16' rx='2' />
                <path d='M22 7l-10 6L2 7' />
              </svg>
              <input
                ref={emailRef}
                id='email'
                name='email'
                type='email'
                className='login-page__input'
                placeholder={t('login.emailPlaceholder')}
                autoComplete='email'
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                aria-required='true'
              />
            </div>
          </div>

          <div className='login-page__form-item'>
            <label className='login-page__label' htmlFor='password'>
              {t('login.password')}
            </label>
            <div className='login-page__input-wrapper'>
              <svg
                className='login-page__input-icon'
                viewBox='0 0 24 24'
                fill='none'
                stroke='currentColor'
                strokeWidth='2'
                aria-hidden='true'
              >
                <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
                <path d='M7 11V7a5 5 0 0 1 10 0v4' />
              </svg>
              <input
                id='password'
                name='password'
                type={passwordVisible ? 'text' : 'password'}
                className='login-page__input'
                placeholder={t('login.passwordPlaceholder')}
                autoComplete='current-password'
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-required='true'
              />
              <button
                type='button'
                className='login-page__toggle-password'
                onClick={() => setPasswordVisible((prev) => !prev)}
                aria-label={passwordVisible ? t('login.hidePassword') : t('login.showPassword')}
              >
                <svg viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                  {passwordVisible ? (
                    <>
                      <path d='M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24' />
                      <line x1='1' y1='1' x2='23' y2='23' />
                    </>
                  ) : (
                    <>
                      <path d='M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' />
                      <circle cx='12' cy='12' r='3' />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </div>

          <div className='login-page__form-actions'>
            <div className='login-page__checkbox'>
              <input
                type='checkbox'
                id='remember-me'
                checked={rememberMe}
                onChange={(event) => setRememberMe(event.target.checked)}
              />
              <label htmlFor='remember-me'>{t('login.rememberMe')}</label>
            </div>
            <button type='button' className='login-page__forgot-password' disabled aria-disabled='true' tabIndex={-1}>
              {t('login.forgotPassword')}
            </button>
          </div>

          <button type='submit' className='login-page__submit' disabled={loading}>
            {loading && (
              <svg className='login-page__spinner' viewBox='0 0 24 24' width='18' height='18'>
                <circle
                  cx='12'
                  cy='12'
                  r='10'
                  stroke='currentColor'
                  strokeWidth='3'
                  fill='none'
                  strokeDasharray='50'
                  strokeDashoffset='25'
                  strokeLinecap='round'
                />
              </svg>
            )}
            <span>{loading ? t('login.submitting') : t('login.submit')}</span>
          </button>

          <div
            role='alert'
            aria-live='polite'
            className={`login-page__message ${message ? 'login-page__message--visible' : ''} ${message ? (message.type === 'success' ? 'login-page__message--success' : 'login-page__message--error') : ''}`}
            hidden={!message}
          >
            {message?.text}
          </div>
        </form>

        <div className='login-page__footer'>
          <div className='login-page__footer-content'>
            <span>Mon jardin avec Largo</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
