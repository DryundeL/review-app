import "./AchievementsPage.css";

export function AchievementsPage() {
  return (
    <section className="screen achievements-page">
      <h1 className="achievements-page__title">Достижения</h1>
      <article className="achievements-page__hero card">
        <div className="achievements-page__hero-icon" aria-hidden>
          ★
        </div>
        <div className="achievements-page__hero-copy">
          <h2 className="achievements-page__hero-title">Скоро здесь</h2>
          <p className="achievements-page__hero-text">
            Разблокировки аватара и апгрейды появятся в этом разделе.
          </p>
        </div>
      </article>
    </section>
  );
}
