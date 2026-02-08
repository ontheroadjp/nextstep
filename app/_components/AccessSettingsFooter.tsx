import type { Dispatch, SetStateAction } from "react";

export type AuthState = "ready" | "refresh_missing" | "access_missing";

type AccessSettingsFooterProps = {
  accessToken: string;
  setAccessToken: Dispatch<SetStateAction<string>>;
  refreshToken: string;
  setRefreshToken: Dispatch<SetStateAction<string>>;
  tzOffset: string;
  setTzOffset: Dispatch<SetStateAction<string>>;
  onRefresh: () => void;
  canFetch: boolean;
  authState: AuthState;
};

export function AccessSettingsFooter({
  accessToken,
  setAccessToken,
  refreshToken,
  setRefreshToken,
  tzOffset,
  setTzOffset,
  onRefresh,
  canFetch,
  authState,
}: AccessSettingsFooterProps) {
  const hintByState: Record<Exclude<AuthState, "ready">, string> = {
    access_missing: "access token を入れると取得できます",
    refresh_missing: "refresh token を入れると自動更新できます",
  };

  return (
    <footer className="footer-panel">
      <div className="panel">
        <label>
          Access Token
          <textarea
            value={accessToken}
            onChange={(e) => setAccessToken(e.target.value)}
            placeholder="Bearer access token を貼り付け"
            rows={3}
          />
        </label>
        <label>
          Refresh Token
          <textarea
            value={refreshToken}
            onChange={(e) => setRefreshToken(e.target.value)}
            placeholder="refresh token を貼り付け"
            rows={3}
          />
        </label>
        <label>
          TZ Offset (minutes)
          <input value={tzOffset} onChange={(e) => setTzOffset(e.target.value)} placeholder="540" />
        </label>
        <div className="actions">
          <button onClick={onRefresh} disabled={!canFetch}>
            Refresh
          </button>
          <button
            onClick={() => {
              setAccessToken("");
              setRefreshToken("");
            }}
          >
            Clear
          </button>
          {authState !== "ready" && <span className="hint">{hintByState[authState]}</span>}
        </div>
      </div>
    </footer>
  );
}
