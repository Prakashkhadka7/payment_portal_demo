/** Runtime configuration consumed by the app. Values originate from `.env` (see `.env.example`). */
export interface AppEnvironment {
  readonly apiBaseUrl: string;
}

export const environment: AppEnvironment = {
  apiBaseUrl: NG_APP_API_BASE_URL,
};
