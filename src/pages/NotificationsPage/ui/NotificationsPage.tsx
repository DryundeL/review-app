import { Link } from "react-router-dom";
import "./NotificationsPage.css";

const ITEMS = [
  { id: "n1", href: "/reviews/r-frieren", text: "Плюс к обзору о Фрирен" },
  { id: "n2", href: "/reviews/r-aot", text: "Комментарий к обзору «Атаки титанов»" },
  { id: "n3", href: "/profile", text: "Новая подписка на профиль" },
] as const;

export function NotificationsPage() {
  return (
    <section className="screen">
      <h1>Уведомления</h1>
      <ul className="notes">
        {ITEMS.map((item) => (
          <li key={item.id}>
            <Link className="notes__link" to={item.href}>
              {item.text}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
