export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  username: string | null;
  bio: string;
  created_at: string;
  updated_at: string;
}

export interface ProfileFormData {
  full_name: string;
  username: string;
  bio: string;
}