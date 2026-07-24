// Abstract interfaces for backend services - backend-agnostic

export type UserRole = 'super_admin' | 'admin' | 'inspector' | 'user' | 'support';
export type MlmRank = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'crown';
export type MlmPlan = string;
export type UserStatus = 'active' | 'suspended' | 'pending' | 'inactive';

export interface Profile {
  id: string;
  username: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  rank: MlmRank;
  plan: MlmPlan;
  referral_code?: string;
  invite_link?: string;
  slug?: string;
  bio?: string;
  sponsor_id?: string;
  binary_position?: string;
  force_password_change?: boolean;
  email_confirmed?: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  email: string;
  emailConfirmed: boolean;
  createdAt: string;
  lastSignInAt?: string;
  metadata?: Record<string, unknown>;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  user: User;
}

export interface AuthResult {
  success: boolean;
  session?: Session;
  error?: string;
}

export interface FileUploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

export interface FileMetadata {
  name: string;
  size: number;
  contentType: string;
  url: string;
  createdAt?: string;
}

// Filter operators supported by PostgREST
export type FilterOperator =
  | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
  | 'like' | 'ilike' | 'is' | 'in' | 'not'
  | 'cs' | 'cd' | 'ov' | 'sl' | 'sr' | 'nxr' | 'nxl' | 'adj';

// A structured filter condition
export interface FilterCondition {
  column: string;
  operator: FilterOperator;
  value: unknown;
}

// A filter can be:
// - A simple object of {column: value} (implicit eq, null → is, array → in)
// - An array of FilterCondition objects for complex queries
// - A raw string for advanced PostgREST OR/AND expressions (e.g. "col1.eq.val,col2.eq.val2")
export type Filter = Record<string, unknown> | FilterCondition[] | string;

export interface OrderClause {
  column: string;
  ascending?: boolean;
  nullsFirst?: boolean;
}

export interface QueryOptions {
  select?: string | string[];
  filter?: Filter;
  order?: OrderClause | OrderClause[];
  limit?: number;
  offset?: number;
  single?: boolean;
  maybeSingle?: boolean;
  count?: 'exact' | 'planned' | 'estimated';
  head?: boolean;
  range?: { from: number; to: number };
}

export interface QueryResult<T> {
  data: T[] | T | null;
  error?: string;
  count?: number;
}

export interface InsertResult<T> {
  data?: T;
  error?: string;
}

export interface UpdateResult<T> {
  data?: T;
  error?: string;
}

export interface DeleteResult {
  success: boolean;
  error?: string;
}

export interface AuthInterface {
  signUp(email: string, password: string, metadata?: Record<string, unknown>): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signInWithOAuth(provider: string): Promise<{ url?: string; error?: string }>;
  signOut(): Promise<{ error?: string }>;
  getSession(): Promise<Session | null>;
  getUser(): Promise<User | null>;
  updateUser(metadata: Record<string, unknown>): Promise<AuthResult>;
  resetPassword(email: string): Promise<{ error?: string }>;
  updatePassword(newPassword: string): Promise<{ error?: string }>;
  onAuthStateChange(callback: (event: string, session: Session | null) => void): () => void;
}

export interface UploadOptions {
  upsert?: boolean;
  contentType?: string;
  cacheControl?: string;
  metadata?: Record<string, string>;
}

export interface StorageInterface {
  upload(bucket: string, path: string, file: File | Blob, options?: UploadOptions): Promise<FileUploadResult>;
  download(bucket: string, path: string): Promise<Blob | null>;
  getPublicUrl(bucket: string, path: string): string;
  list(bucket: string, path?: string): Promise<FileMetadata[]>;
  remove(bucket: string, paths: string[]): Promise<DeleteResult>;
  exists(bucket: string, path: string): Promise<boolean>;
}

export interface DeleteOptions {
  filter?: Filter;
}

export interface UpdateOptions {
  filter?: Filter;
  select?: string;
}

export interface DatabaseInterface {
  select<T>(table: string, options?: QueryOptions): Promise<QueryResult<T>>;
  insert<T>(table: string, data: Partial<T> | Partial<T>[]): Promise<InsertResult<T>>;
  update<T>(table: string, id: string | Filter, data: Partial<T>, options?: UpdateOptions): Promise<UpdateResult<T>>;
  delete(table: string, id: string, options?: DeleteOptions): Promise<DeleteResult>;
  deleteWhere(table: string, filter: Filter): Promise<DeleteResult>;
  upsert<T>(table: string, data: Partial<T> | Partial<T>[], conflictKey?: string): Promise<InsertResult<T>>;
  rpc<T>(fn: string, args?: Record<string, unknown>): Promise<QueryResult<T>>;
  subscribe(table: string, callback: (payload: unknown) => void, options?: SubscribeOptions): () => void;
  invoke<T>(name: string, options?: { body?: unknown; headers?: Record<string, string> }): Promise<{ data: T | null; error?: string }>;
}

export interface SubscribeOptions {
  event?: '*' | 'INSERT' | 'UPDATE' | 'DELETE';
  schema?: string;
  filter?: string;
}

export interface BackendServices {
  auth: AuthInterface;
  storage: StorageInterface;
  database: DatabaseInterface;
  config: DatabaseInterface;
}

export interface ExportData {
  version: string;
  exportedAt: string;
  tables: Record<string, unknown[]>;
  storage: Record<string, FileMetadata[]>;
  auth: {
    users: Pick<User, 'id' | 'email' | 'emailConfirmed' | 'createdAt'>[];
  };
}
