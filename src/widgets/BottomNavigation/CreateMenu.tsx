import { Link } from "react-router-dom";
import { Modal } from "@/shared/ui";
import "./CreateMenu.css";

type CreateMenuProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const OPTIONS = [
  {
    to: "/create",
    icon: "review",
    title: "Обзор",
    text: "Оценка и рецензия на аниме, мангу, фильм или сериал",
  },
  {
    to: "/lists?tab=templates",
    icon: "top",
    title: "Топ",
    text: "Тир-лист, рейтинг или подборка: выберите шаблон и расставьте по-своему",
  },
] as const;

/** Выбор, что создать: шторка на телефоне, диалог на десктопе. */
export function CreateMenu({ open, onOpenChange }: CreateMenuProps) {
  const close = () => onOpenChange(false);

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Что добавить?" className="create-menu">
      <ul className="create-menu__options">
        {OPTIONS.map((option, index) => (
          <li
            key={option.to}
            className="create-menu__item"
            style={{ ["--create-menu-index" as string]: index }}
          >
            <Link className="create-menu__option" to={option.to} onClick={close}>
              <span className={`create-menu__icon create-menu__icon--${option.icon}`}>
                <OptionIcon name={option.icon} />
              </span>
              <span className="create-menu__text">
                <span className="create-menu__title">{option.title}</span>
                <span className="create-menu__hint">{option.text}</span>
              </span>
              <span className="create-menu__chevron" aria-hidden="true">
                ›
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <p
        className="create-menu__footer"
        style={{ ["--create-menu-index" as string]: OPTIONS.length }}
      >
        Нет подходящего шаблона?{" "}
        <Link to="/my-lists?create=template" onClick={close}>
          Создать свой шаблон
        </Link>
      </p>
    </Modal>
  );
}

function OptionIcon({ name }: { name: (typeof OPTIONS)[number]["icon"] }) {
  return (
    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
      {name === "review" ? (
        <>
          <path d="M5 4h10l4 4v12H5z" />
          <path d="M15 4v4h4M8.5 12h7M8.5 16h5" />
        </>
      ) : (
        <>
          <rect x="3.5" y="4" width="4" height="4" rx="1" />
          <rect x="3.5" y="10" width="4" height="4" rx="1" />
          <rect x="3.5" y="16" width="4" height="4" rx="1" />
          <path d="M10.5 6h10M10.5 12h7M10.5 18h4" />
        </>
      )}
    </svg>
  );
}
