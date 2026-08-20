export interface MeResponse {
  user: {
    id: string;
    username: string | null;
    role: 'PLAYER' | 'ADMIN';
    status: 'ACTIVE' | 'SUSPENDED';
  } | null;
  requiresOnboarding: boolean;
}
