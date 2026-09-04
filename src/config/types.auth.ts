// Defines auth profile configuration types.
export type AuthProfileConfig = {
  /** Provider id this auth profile can satisfy. */
  provider: string;
  /**
   * Auth route selected by this profile id.
   * - api_key: static provider API key
   * - oauth: refreshable OAuth credentials (access+refresh+expires)
   * - token: static bearer-style token (optionally expiring; no refresh)
   * - aws-sdk: AWS SDK default credential chain (no secret in auth-profiles.json)
   */
  mode: "api_key" | "aws-sdk" | "oauth" | "token";
  /** Optional account email shown in profile selection/status surfaces. */
  email?: string;
  /** Optional human-readable label shown in profile selection/status surfaces. */
  displayName?: string;
};

export type AuthConfig = {
  /** Named auth profiles keyed by profile id. */
  profiles?: Record<string, AuthProfileConfig>;
  /** Preferred profile order per provider id. */
  order?: Record<string, string[]>;
  /** Failure-backoff policy shared by auth rotation and model fallback. */
  cooldowns?: {
    /**
     * When true (the default), a rate limit escalates to the model fallback
     * chain once auth-profile rotation is exhausted. Set false to never switch
     * models on a 429: the run keeps the selected model and surfaces the error
     * if the limit persists.
     */
    fallbackOnRateLimit?: boolean;
    /**
     * Provider ids that always wait and retry the same model on a rate limit,
     * whatever `fallbackOnRateLimit` says. Use it for providers whose limits
     * clear quickly, so a short wait beats paying a pricier fallback.
     */
    waitOnRateLimitProviders?: string[];
  };
};
