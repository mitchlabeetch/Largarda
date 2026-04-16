import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mutable mock values
const mockNavigate = vi.fn();
const mockLogin = vi.fn();
let mockAuthStatus = 'unauthenticated';

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr-FR' },
  }),
}));

// Mock the auth context — both alias and relative path needed for Vitest resolution
vi.mock('@renderer/hooks/context/AuthContext', () => ({
  useAuth: () => ({
    status: mockAuthStatus,
    login: mockLogin,
    logout: vi.fn(),
    refresh: vi.fn(),
    ready: true,
    user: null,
    clearAuthCache: vi.fn(),
  }),
}));

vi.mock('@renderer/components/layout/AppLoader', () => ({
  default: () => <div data-testid='app-loader'>Loading...</div>,
}));

vi.mock('@renderer/pages/login/BinaryGrass', () => ({
  default: () => <div data-testid='binary-grass' />,
}));

vi.mock('@renderer/assets/logos/brand/app.png', () => ({
  default: 'test-logo.png',
}));

vi.mock('@/renderer/services/i18n', () => ({
  changeLanguage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('@/common/config/i18n', () => ({
  SUPPORTED_LANGUAGES: ['fr-FR', 'zh-CN', 'en-US', 'ja-JP', 'zh-TW', 'ko-KR', 'tr-TR', 'ru-RU', 'uk-UA'],
}));

// Mock LoginPage.css (plain CSS import)
vi.mock('@renderer/pages/login/LoginPage.css', () => ({}));
vi.mock('./LoginPage.css', () => ({}));

import LoginPage from '@renderer/pages/login/index';

describe('LoginPage', () => {
  beforeEach(() => {
    mockAuthStatus = 'unauthenticated';
    mockNavigate.mockReset();
    mockLogin.mockReset();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    document.body.classList.remove('login-page-active');
  });

  // -- Rendering --

  it('renders the login form with brand title', () => {
    render(<LoginPage />);
    expect(screen.getByText('login.brand')).toBeTruthy();
  });

  it('renders the subtitle', () => {
    render(<LoginPage />);
    expect(screen.getByText('login.subtitle')).toBeTruthy();
  });

  it('renders email and password input fields', () => {
    render(<LoginPage />);
    expect(screen.getByPlaceholderText('login.emailPlaceholder')).toBeTruthy();
    expect(screen.getByPlaceholderText('login.passwordPlaceholder')).toBeTruthy();
  });

  it('renders the email input with type=email', () => {
    render(<LoginPage />);
    const emailInput = screen.getByPlaceholderText('login.emailPlaceholder');
    expect(emailInput.getAttribute('type')).toBe('email');
  });

  it('renders the BinaryGrass background', () => {
    render(<LoginPage />);
    expect(screen.getByTestId('binary-grass')).toBeTruthy();
  });

  it('renders the Google OAuth button', () => {
    render(<LoginPage />);
    expect(screen.getByText('login.loginWithGoogle')).toBeTruthy();
  });

  it('renders the separator', () => {
    render(<LoginPage />);
    expect(screen.getByText('login.separator')).toBeTruthy();
  });

  it('renders the forgot password link as disabled placeholder', () => {
    render(<LoginPage />);
    const btn = screen.getByText('login.forgotPassword');
    expect(btn).toBeTruthy();
    expect((btn as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders the footer with taglines', () => {
    render(<LoginPage />);
    expect(screen.getByText('login.footerPrimary')).toBeTruthy();
    expect(screen.getByText('login.footerSecondary')).toBeTruthy();
  });

  it('renders language selector with Français first', () => {
    render(<LoginPage />);
    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');
    expect(options[0]?.textContent).toBe('Français');
  });

  it('renders all nine supported languages', () => {
    render(<LoginPage />);
    const select = screen.getByRole('combobox');
    const options = select.querySelectorAll('option');
    expect(options.length).toBe(9);
  });

  // -- Page-level side effects --

  it('sets page title on mount', () => {
    render(<LoginPage />);
    expect(document.title).toBe('login.pageTitle');
  });

  it('adds login-page-active class to body on mount', () => {
    render(<LoginPage />);
    expect(document.body.classList.contains('login-page-active')).toBe(true);
  });

  it('removes login-page-active class from body on unmount', () => {
    const { unmount } = render(<LoginPage />);
    expect(document.body.classList.contains('login-page-active')).toBe(true);
    unmount();
    expect(document.body.classList.contains('login-page-active')).toBe(false);
  });

  it('sets document lang to the i18n language', () => {
    render(<LoginPage />);
    expect(document.documentElement.lang).toBe('fr-FR');
  });

  // -- Auth status --

  it('shows AppLoader when auth status is checking', () => {
    mockAuthStatus = 'checking';
    render(<LoginPage />);
    expect(screen.getByTestId('app-loader')).toBeTruthy();
  });

  it('navigates to /guid when already authenticated', () => {
    mockAuthStatus = 'authenticated';
    render(<LoginPage />);
    expect(mockNavigate).toHaveBeenCalledWith('/guid', { replace: true });
  });

  // -- Form validation --

  it('shows error on empty form submission', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText('login.submit'));
    await waitFor(() => {
      expect(screen.getByText('login.errors.empty')).toBeTruthy();
    });
  });

  it('shows error when only email is filled', async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'user@test.com' },
    });
    fireEvent.click(screen.getByText('login.submit'));
    await waitFor(() => {
      expect(screen.getByText('login.errors.empty')).toBeTruthy();
    });
  });

  it('shows error when only password is filled', async () => {
    render(<LoginPage />);
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'secret' },
    });
    fireEvent.click(screen.getByText('login.submit'));
    await waitFor(() => {
      expect(screen.getByText('login.errors.empty')).toBeTruthy();
    });
  });

  // -- Successful login --

  it('calls login with email as username on valid submission', async () => {
    mockLogin.mockResolvedValue({ success: true });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'test@largo.fr' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({
        username: 'test@largo.fr',
        password: 'password123',
        remember: false,
      });
    });
  });

  it('shows success message after successful login', async () => {
    mockLogin.mockResolvedValue({ success: true });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'ok@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(screen.getByText('login.success')).toBeTruthy();
    });
  });

  // -- Error scenarios --

  it('shows error on invalid credentials', async () => {
    mockLogin.mockResolvedValue({ success: false, code: 'invalidCredentials' });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'bad@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(screen.getByText('login.errors.invalidCredentials')).toBeTruthy();
    });
  });

  it('shows error on too many attempts', async () => {
    mockLogin.mockResolvedValue({ success: false, code: 'tooManyAttempts' });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(screen.getByText('login.errors.tooManyAttempts')).toBeTruthy();
    });
  });

  it('shows error on network error', async () => {
    mockLogin.mockResolvedValue({ success: false, code: 'networkError' });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(screen.getByText('login.errors.networkError')).toBeTruthy();
    });
  });

  it('shows error on server error', async () => {
    mockLogin.mockResolvedValue({ success: false, code: 'serverError' });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(screen.getByText('login.errors.serverError')).toBeTruthy();
    });
  });

  it('shows custom message on unknown error code', async () => {
    mockLogin.mockResolvedValue({ success: false, code: 'unknown', message: 'Custom error' });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(screen.getByText('Custom error')).toBeTruthy();
    });
  });

  it('falls back to i18n unknown error when no custom message provided', async () => {
    mockLogin.mockResolvedValue({ success: false, code: 'unknown' });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'x' },
    });
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(screen.getByText('login.errors.unknown')).toBeTruthy();
    });
  });

  // -- Password visibility toggle --

  it('toggles password visibility', () => {
    render(<LoginPage />);
    const passwordInput = screen.getByPlaceholderText('login.passwordPlaceholder');
    expect(passwordInput.getAttribute('type')).toBe('password');

    // Initially password is hidden, so aria-label is "showPassword"
    const toggleBtn = screen.getByLabelText('login.showPassword');
    fireEvent.click(toggleBtn);
    expect(passwordInput.getAttribute('type')).toBe('text');

    // After clicking, aria-label switches to "hidePassword"
    const toggleBack = screen.getByLabelText('login.hidePassword');
    fireEvent.click(toggleBack);
    expect(passwordInput.getAttribute('type')).toBe('password');
  });

  // -- Remember me --

  it('saves email when remember me is checked', async () => {
    mockLogin.mockResolvedValue({ success: true });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'memo@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'pass' },
    });
    // Check "remember me"
    const checkbox = screen.getByLabelText('login.rememberMe');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(localStorage.getItem('rememberMe')).toBe('true');
      expect(localStorage.getItem('rememberedEmail')).toBeTruthy();
    });
  });

  it('does not store password in localStorage', async () => {
    mockLogin.mockResolvedValue({ success: true });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'memo@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'secret123' },
    });
    const checkbox = screen.getByLabelText('login.rememberMe');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(localStorage.getItem('rememberMe')).toBe('true');
    });
    // Password must never be stored
    expect(localStorage.getItem('rememberedPassword')).toBeNull();
  });

  it('clears remembered email when remember me is unchecked', async () => {
    // Pre-populate remembered data
    localStorage.setItem('rememberMe', 'true');
    localStorage.setItem('rememberedEmail', 'old');

    mockLogin.mockResolvedValue({ success: true });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'no-memo@test.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'pass' },
    });

    // Uncheck remember me (it was auto-checked via localStorage restore)
    const checkbox = screen.getByLabelText('login.rememberMe');
    fireEvent.click(checkbox);
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(localStorage.getItem('rememberMe')).toBeNull();
      expect(localStorage.getItem('rememberedEmail')).toBeNull();
    });
  });

  it('restores remembered email from localStorage', () => {
    // Use the same base64 encoding the component now uses
    localStorage.setItem('rememberMe', 'true');
    localStorage.setItem('rememberedEmail', btoa(encodeURIComponent('recalled@test.com')));

    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('login.emailPlaceholder') as HTMLInputElement;
    const passwordInput = screen.getByPlaceholderText('login.passwordPlaceholder') as HTMLInputElement;

    expect(emailInput.value).toBe('recalled@test.com');
    // Password is never stored, so it should remain empty
    expect(passwordInput.value).toBe('');
  });

  it('handles corrupted remembered email gracefully', () => {
    localStorage.setItem('rememberMe', 'true');
    localStorage.setItem('rememberedEmail', '!!!invalid-base64!!!');

    // Should not throw
    render(<LoginPage />);

    const emailInput = screen.getByPlaceholderText('login.emailPlaceholder') as HTMLInputElement;
    // deobfuscate returns '' for invalid input
    expect(emailInput.value).toBe('');
  });

  // -- Submit button states --

  it('disables the submit button while loading', async () => {
    // Return a pending promise to keep loading state
    let resolveLogin: (v: { success: boolean }) => void;
    mockLogin.mockImplementation(
      () =>
        new Promise<{ success: boolean }>((resolve) => {
          resolveLogin = resolve;
        })
    );

    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: 'a@b.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      const submitBtn = screen.getByText('login.submitting').closest('button');
      expect(submitBtn?.disabled).toBe(true);
    });

    // Cleanup: resolve the promise
    resolveLogin!({ success: true });
  });

  it('trims email whitespace before submitting', async () => {
    mockLogin.mockResolvedValue({ success: true });
    render(<LoginPage />);

    fireEvent.change(screen.getByPlaceholderText('login.emailPlaceholder'), {
      target: { value: '  user@test.com  ' },
    });
    fireEvent.change(screen.getByPlaceholderText('login.passwordPlaceholder'), {
      target: { value: 'pass' },
    });
    fireEvent.click(screen.getByText('login.submit'));

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith(expect.objectContaining({ username: 'user@test.com' }));
    });
  });

  // -- Logo --

  it('renders the brand logo image', () => {
    render(<LoginPage />);
    const img = screen.getByAltText('login.brand');
    expect(img).toBeTruthy();
    expect(img.getAttribute('src')).toBe('test-logo.png');
  });
});
