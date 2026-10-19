import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  equipCosmetics,
  fetchGamificationMe,
  fetchShopCatalog,
  purchaseShopItem,
  shopAssetUrl,
  type ShopItem,
  type ShopItemKind,
} from "@/entities/gamification";
import { refreshSessionProfile } from "@/features/auth";
import { ApiError } from "@/shared/api";
import { Button } from "@/shared/ui";
import "./ShopPage.css";

const KIND_LABEL: Record<ShopItemKind, string> = {
  avatar_frame: "Рамки",
  background: "Фоны",
  backdrop: "Подложки",
};

const KIND_ORDER: ShopItemKind[] = ["avatar_frame", "background", "backdrop"];

export function ShopPage() {
  const queryClient = useQueryClient();

  const catalogQuery = useQuery({
    queryKey: ["shop-catalog"],
    queryFn: ({ signal }) => fetchShopCatalog(signal),
  });

  const meQuery = useQuery({
    queryKey: ["gamification-me"],
    queryFn: ({ signal }) => fetchGamificationMe(signal),
  });

  const purchaseMutation = useMutation({
    mutationFn: (itemId: string) => purchaseShopItem(itemId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["gamification-me"] });
    },
  });

  const equipMutation = useMutation({
    mutationFn: (item: ShopItem) =>
      equipCosmetics({
        [equipKey(item.kind)]: item.code,
      }),
    onSuccess: async (equipped) => {
      queryClient.setQueryData(["gamification-me"], (prev: unknown) => {
        if (!prev || typeof prev !== "object") return prev;
        return { ...prev, equipped };
      });
      refreshSessionProfile();
    },
  });

  const unequipMutation = useMutation({
    mutationFn: (kind: ShopItemKind) =>
      equipCosmetics({
        [equipKey(kind)]: null,
      }),
    onSuccess: async (equipped) => {
      queryClient.setQueryData(["gamification-me"], (prev: unknown) => {
        if (!prev || typeof prev !== "object") return prev;
        return { ...prev, equipped };
      });
      refreshSessionProfile();
    },
  });

  if (catalogQuery.isLoading || meQuery.isLoading) {
    return (
      <section className="shop-page screen" aria-busy="true">
        <h1>Магазин</h1>
        <p className="shop-page__muted">Загрузка…</p>
      </section>
    );
  }

  if (catalogQuery.isError || meQuery.isError || !catalogQuery.data || !meQuery.data) {
    return (
      <section className="shop-page screen" role="alert">
        <h1>Магазин</h1>
        <p>{messageFromError(catalogQuery.error ?? meQuery.error)}</p>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            void catalogQuery.refetch();
            void meQuery.refetch();
          }}
        >
          Повторить
        </Button>
      </section>
    );
  }

  const me = meQuery.data;
  const owned = new Set(me.ownedCodes);
  const busy =
    purchaseMutation.isPending || equipMutation.isPending || unequipMutation.isPending;
  const actionError =
    purchaseMutation.error ?? equipMutation.error ?? unequipMutation.error;

  return (
    <section className="shop-page screen">
      <header className="shop-page__head">
        <h1>Магазин</h1>
        <p className="shop-page__balance" aria-live="polite">
          Баланс: <strong>{me.pointsBalance}</strong>
        </p>
      </header>

      {actionError ? (
        <p className="shop-page__error" role="alert">
          {messageFromError(actionError)}
        </p>
      ) : null}

      {KIND_ORDER.map((kind) => {
        const items = catalogQuery.data.items.filter((item) => item.kind === kind);
        if (items.length === 0) return null;
        return (
          <section key={kind} className="shop-page__section" aria-labelledby={`shop-${kind}`}>
            <h2 id={`shop-${kind}`} className="shop-page__section-title">
              {KIND_LABEL[kind]}
            </h2>
            <ul className="shop-page__grid">
              {items.map((item) => {
                const preview = shopAssetUrl(item.code);
                const isOwned = owned.has(item.code);
                const isEquipped = equippedCode(me.equipped, kind) === item.code;
                return (
                  <li key={item.id} className="shop-page__card">
                    <div
                      className={`shop-page__preview shop-page__preview--${kind}`}
                      style={
                        preview
                          ? {
                              backgroundImage: `url("${preview}")`,
                            }
                          : undefined
                      }
                      aria-hidden
                    />
                    <div className="shop-page__meta">
                      <span className="shop-page__title">{item.title}</span>
                      <span className="shop-page__price">{item.price} очк.</span>
                    </div>
                    <div className="shop-page__actions">
                      {!isOwned ? (
                        <Button
                          type="button"
                          className="shop-page__btn"
                          disabled={busy || me.pointsBalance < item.price}
                          onClick={() => purchaseMutation.mutate(item.id)}
                        >
                          Купить
                        </Button>
                      ) : isEquipped ? (
                        <Button
                          type="button"
                          className="shop-page__btn"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => unequipMutation.mutate(kind)}
                        >
                          Снять
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          className="shop-page__btn"
                          variant="secondary"
                          disabled={busy}
                          onClick={() => equipMutation.mutate(item)}
                        >
                          Надеть
                        </Button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      {catalogQuery.data.items.length === 0 ? (
        <p className="shop-page__muted" role="status">
          Каталог пока пуст.
        </p>
      ) : null}
    </section>
  );
}

function equipKey(kind: ShopItemKind): "avatarFrame" | "background" | "backdrop" {
  if (kind === "avatar_frame") return "avatarFrame";
  if (kind === "background") return "background";
  return "backdrop";
}

function equippedCode(
  equipped: { background: string | null; avatarFrame: string | null; backdrop: string | null },
  kind: ShopItemKind,
): string | null {
  if (kind === "avatar_frame") return equipped.avatarFrame;
  if (kind === "background") return equipped.background;
  return equipped.backdrop;
}

function messageFromError(error: unknown, fallback = "Не удалось выполнить запрос."): string {
  if (error instanceof ApiError) {
    if (error.code === "INSUFFICIENT_POINTS") return "Недостаточно очков.";
    if (error.code === "CONFLICT") return "Уже куплено.";
    if (error.code === "NOT_OWNED") return "Сначала купите предмет.";
    return error.message;
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
