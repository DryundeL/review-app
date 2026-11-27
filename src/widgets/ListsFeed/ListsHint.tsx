import type { ReactNode } from "react";
import "./ListsFeed.css";

type ListsHintProps = {
  children: ReactNode;
  /** Кнопка или ссылка следующего шага. */
  action?: ReactNode;
};

/** Короткое пояснение над списком: что здесь и что делать дальше. */
export function ListsHint({ children, action }: ListsHintProps) {
  return (
    <div className="lists-hint">
      <p className="lists-hint__text">{children}</p>
      {action ? <div className="lists-hint__action">{action}</div> : null}
    </div>
  );
}
