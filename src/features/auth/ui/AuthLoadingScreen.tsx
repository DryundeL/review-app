export function AuthLoadingScreen() {
  return (
    <main className="auth-loading" aria-busy="true" aria-label="Загрузка приложения">
      <img
        className="auth-loading__mark"
        src="/favicon.png"
        width={72}
        height={72}
        alt=""
      />
      <p className="auth-loading__title" role="status">
        Готовим ваш Review Hub
      </p>
      <div className="auth-loading__track" aria-hidden="true" />
    </main>
  );
}
