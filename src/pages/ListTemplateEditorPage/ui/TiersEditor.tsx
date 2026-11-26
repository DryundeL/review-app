import { Button, Input } from "@/shared/ui";
import {
  LIMITS,
  moveEntry,
  NEW_TIER_COLOR,
  newTier,
  type DraftTier,
} from "../model/templateDraft";
import { FieldError } from "./FieldError";

const TIERS_MIN = LIMITS.tiersMin;
const TIERS_MAX = LIMITS.tiersMax;
const COLOR = /^#[0-9a-f]{6}$/i;

type TiersEditorProps = {
  tiers: DraftTier[];
  errorFor: (key: string) => string | undefined;
  onUpdate: (update: (tiers: DraftTier[]) => DraftTier[]) => void;
};

export function TiersEditor({ tiers, errorFor, onUpdate }: TiersEditorProps) {
  const patch = (key: string, next: Partial<DraftTier>) =>
    onUpdate((list) =>
      list.map((tier) => (tier.key === key ? { ...tier, ...next } : tier)),
    );
  const move = (key: string, delta: -1 | 1) =>
    onUpdate((list) =>
      moveEntry(
        list,
        list.findIndex((tier) => tier.key === key),
        delta,
      ),
    );
  const remove = (key: string) =>
    onUpdate((list) =>
      list.length > TIERS_MIN ? list.filter((tier) => tier.key !== key) : list,
    );
  const add = () =>
    onUpdate((list) => (list.length < TIERS_MAX ? [...list, newTier()] : list));

  return (
    <section className="template-editor__section" aria-labelledby="template-editor-tiers">
      <h2 id="template-editor-tiers" className="template-editor__heading">
        Тиры{" "}
        <span className="muted">
          {tiers.length}/{TIERS_MAX}
        </span>
      </h2>
      <FieldError text={errorFor("tiers")} />
      <ol className="template-editor__list">
        {tiers.map((tier, index) => {
          const nameError = errorFor(`tiers.name:${index}`);
          const colorError = errorFor(`tiers.color:${index}`);
          const rowError = errorFor(`tiers.id:${index}`) ?? errorFor(`tiers:${index}`);
          const number = index + 1;
          return (
            <li key={tier.key} className="template-editor__row">
              <div className="template-editor__row-main">
                <input
                  type="color"
                  className="template-editor__color"
                  aria-label={`Цвет тира ${number}`}
                  aria-invalid={colorError ? true : undefined}
                  value={
                    COLOR.test(tier.color) ? tier.color.toLowerCase() : NEW_TIER_COLOR
                  }
                  onChange={(event) => {
                    const color = event.target.value;
                    if (COLOR.test(color)) patch(tier.key, { color });
                  }}
                />
                <Input
                  className={nameError ? "is-invalid" : undefined}
                  aria-label={`Название тира ${number}`}
                  aria-invalid={nameError ? true : undefined}
                  maxLength={LIMITS.tierName}
                  value={tier.name}
                  onChange={(event) => patch(tier.key, { name: event.target.value })}
                />
              </div>
              <div className="template-editor__row-actions">
                <Button
                  variant="ghost"
                  aria-label={`Поднять тир ${number}`}
                  disabled={index === 0}
                  onClick={() => move(tier.key, -1)}
                >
                  ↑
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Опустить тир ${number}`}
                  disabled={index === tiers.length - 1}
                  onClick={() => move(tier.key, 1)}
                >
                  ↓
                </Button>
                <Button
                  variant="ghost"
                  aria-label={`Удалить тир ${number}`}
                  disabled={tiers.length <= TIERS_MIN}
                  onClick={() => remove(tier.key)}
                >
                  Удалить
                </Button>
              </div>
              <FieldError text={nameError ?? colorError ?? rowError} />
            </li>
          );
        })}
      </ol>
      <Button variant="secondary" disabled={tiers.length >= TIERS_MAX} onClick={add}>
        Добавить тир
      </Button>
    </section>
  );
}
