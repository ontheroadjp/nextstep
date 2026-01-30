export default function HomePage() {
  return (
    <main>
      <div className="card">
        <h1>nextstep API scaffold</h1>
        <p>Supabase 接続と Route Handlers の準備ができています。</p>
        <p>まずは以下のエンドポイントで疎通確認してください。</p>
        <ul>
          <li><code>/api/today</code></li>
          <li><code>/api/upcoming</code></li>
          <li><code>/api/anytime</code></li>
          <li><code>/api/someday</code></li>
        </ul>
      </div>
    </main>
  );
}
