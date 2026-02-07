import type { Dispatch, SetStateAction } from "react";

type AccessSettingsFooterProps = {
  token: string;
  setToken: Dispatch<SetStateAction<string>>;
  tzOffset: string;
  setTzOffset: Dispatch<SetStateAction<string>>;
  onRefresh: () => void;
  canFetch: boolean;
};

export function AccessSettingsFooter({
  token,
  setToken,
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
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="x-access-token を貼り付け"
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
          <button onClick={() => setToken("")}>Clear</button>
          {!canFetch && <span className="hint">token を入れると取得できます</span>}
        </div>
      </div>
    </footer>
  );
}
