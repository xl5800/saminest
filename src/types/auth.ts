export interface AuthUser {
  id: string;
  email?: string | null;
  email_confirmed_at?: string | null;
  confirmed_at?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

export interface AuthSession {
  user: AuthUser;
  access_token?: string;
  refresh_token?: string;
  [key: string]: unknown;
}

export type AuthChangeEvent =
  | "INITIAL_SESSION"
  | "PASSWORD_RECOVERY"
  | "SIGNED_IN"
  | "SIGNED_OUT"
  | "TOKEN_REFRESHED"
  | "USER_UPDATED";

export type AuthStateChangeCallback = (
  event: AuthChangeEvent,
  session: AuthSession | null
) => void | Promise<void>;

export interface AuthSubscription {
  unsubscribe(): void;
}

export interface AuthResponseData {
  user: AuthUser | null;
  session: AuthSession | null;
}

export interface AuthProfile {
  id: string;
  email: string;
  display_name: string;
  role: string;
  avatar_url?: string | null;
  [key: string]: unknown;
}

export interface AuthAccount {
  name: string;
  email: string;
  role: string;
  provider: "supabase";
  userId: string;
  avatarUrl: string;
}

export interface AuthStateSnapshot {
  session: {
    loggedIn: true;
    account: string;
    email: string;
    role: string;
    provider: string;
    userId: string;
  };
  user: {
    name: string;
    subtitle: string;
    avatar: string;
    avatarUrl: string;
  };
}

export interface AuthenticatedOutcome {
  status: "authenticated";
  account: string;
  savedAccount: AuthAccount;
  user: AuthUser;
  applied: boolean;
}

export interface VerificationRequiredOutcome {
  status: "verification-required";
  reason: "email-unverified" | "email-confirmation";
  returnTo: string;
}

export type AuthFlowOutcome =
  | AuthenticatedOutcome
  | VerificationRequiredOutcome;

export type AuthCompletionMode = "interactive" | "listener" | "restore";

export interface AuthEffects {
  onAuthenticated(
    outcome: AuthenticatedOutcome,
    returnTo: string,
    mode: AuthCompletionMode
  ): void | Promise<void>;
  onVerificationRequired(
    outcome: VerificationRequiredOutcome
  ): void | Promise<void>;
  onSignedOut(options: {
    navigate: boolean;
    target?: string;
    force?: boolean;
  }): void | Promise<void>;
  onRecovery(): void | Promise<void>;
  onTokenRefreshed(user: AuthUser): void | Promise<void>;
  onUserUpdated(user: AuthUser): void | Promise<void>;
}
