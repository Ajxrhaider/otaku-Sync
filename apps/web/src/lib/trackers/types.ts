export interface TrackerProvider {
  platformName: string;
  getAuthorizationUrl(): string;
  exchangeCodeForToken(code: string): Promise<{ accessToken: string; refreshToken?: string }>;
  syncProgress(token: string, mappedId: number, progress: number, status: string): Promise<boolean>;
  fetchUserLibrary(token: string): Promise<UserAnimeList>;
}

// Example user library return type mapping
export interface UserAnimeList {
  watching: Array<{ id: number; title: string; currentEpisode: number }>;
  planToWatch: Array<{ id: number; title: string }>;
  completed: Array<{ id: number; title: string; score: number }>;
}