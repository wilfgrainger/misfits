export function LoginPage() {
  return (
    <main className="page auth-page">
      <div className="auth-card">
        <p className="eyebrow">Player access</p>
        <h1>Sign in</h1>
        <p>Use your Google account. Misfits 501 does not store a separate password.</p>
        <a className="primary-button google-button" href="/auth/google">Sign in with Google</a>
      </div>
    </main>
  );
}
