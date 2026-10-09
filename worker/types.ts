export interface Bindings {
  DATABASE_URL?: string;
  JWT_SECRET?: string;
  CLOUDINARY_CLOUD_NAME?: string;
  CLOUDINARY_API_KEY?: string;
  CLOUDINARY_API_SECRET?: string;
  TURNSTILE_SECRET_KEY?: string;
  NODE_ENV?: string;
}

export interface Variables {
  user?: {
    id: number;
    username: string;
    nama_lengkap?: string;
    email?: string | null;
    role: string;
    staf_role: string | null;
    guru_id: number | null;
    must_change_password?: boolean;
    permissions?: any[];
  };
}

export interface AppContext {
  Bindings: Bindings;
  Variables: Variables;
}
