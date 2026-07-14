export interface ProfileRow {
  id: string;
  email: string | null;
  display_name: string | null;
  role: string | null;
  avatar_url?: string | null;
}

export type ProfilesMap = Record<string, ProfileRow>;
