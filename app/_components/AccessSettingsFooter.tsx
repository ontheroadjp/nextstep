import type { Dispatch, SetStateAction } from "react";

type AccessSettingsFooterProps = {
  accessToken: string;
  setAccessToken: Dispatch<SetStateAction<string>>;
  refreshToken: string;
  setRefreshToken: Dispatch<SetStateAction<string>>;
  tzOffset: string;
  setTzOffset: Dispatch<SetStateAction<string>>;
  onRefresh: () => void;
  canFetch: boolean;
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
}: AccessSettingsFooterProps) {
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
          {!canFetch && <span className="hint">token を入れると取得できます</span>}
        </div>
      </div>
    </footer>
  );
}
