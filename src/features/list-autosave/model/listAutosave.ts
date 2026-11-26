import { ApiError } from "../../../shared/api/errors.ts";

export type AutosaveState<D, S> = {
  draft: D;
  saved: S;
  dirty: boolean;
  saving: boolean;
  conflict: boolean;
  error: ApiError | null;
};

type Options = { auto: boolean; delayMs?: number };

const DEFAULT_DELAY_MS = 1500;

function toApiError(error: unknown): ApiError {
  return error instanceof ApiError
    ? error
    : new ApiError(0, "UNKNOWN", "Не удалось сохранить. Повторите попытку.");
}

export class ListAutosave<D, S extends { revision?: number }> {
  private state: AutosaveState<D, S>;
  private listeners = new Set<() => void>();
  private inflight: Promise<void> | null = null;
  private timer: ReturnType<typeof setTimeout> | undefined;
  // Таймер сработал, пока шёл запрос: сохранить сразу после ответа.
  private wantSave = false;
  private version = 0;
  private epoch = 0;
  private disposed = false;
  private readonly toDraft: (saved: S) => D;
  private readonly saveFn: (revision: number, draft: D) => Promise<S>;
  private readonly auto: boolean;
  private readonly delayMs: number;

  constructor(
    saved: S,
    toDraft: (saved: S) => D,
    save: (revision: number, draft: D) => Promise<S>,
    opts: Options,
  ) {
    this.toDraft = toDraft;
    this.saveFn = save;
    this.auto = opts.auto;
    this.delayMs = opts.delayMs ?? DEFAULT_DELAY_MS;
    this.state = {
      draft: toDraft(saved),
      saved,
      dirty: false,
      saving: false,
      conflict: false,
      error: null,
    };
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  snapshot = (): AutosaveState<D, S> => this.state;

  private set(patch: Partial<AutosaveState<D, S>>) {
    this.state = { ...this.state, ...patch };
    if (!this.disposed) this.listeners.forEach((listener) => listener());
  }

  private clearTimer() {
    clearTimeout(this.timer);
    this.timer = undefined;
  }

  change(patch: Partial<D>) {
    if (this.disposed) return;
    this.version++;
    this.set({ draft: { ...this.state.draft, ...patch }, dirty: true, error: null });
    this.schedule();
  }

  private schedule() {
    if (!this.auto || this.disposed || this.state.conflict || !this.state.dirty) return;
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (this.inflight) {
        this.wantSave = true;
        return;
      }
      this.send().catch(() => {});
    }, this.delayMs);
  }

  private send(): Promise<void> {
    if (this.inflight) return this.inflight;
    this.clearTimer();
    this.wantSave = false;
    const request: Promise<void> = this.perform().then(
      () => {
        if (this.inflight === request) this.inflight = null;
        this.followUp();
      },
      (error: unknown) => {
        if (this.inflight === request) this.inflight = null;
        throw error;
      },
    );
    this.inflight = request;
    return request;
  }

  private async perform(): Promise<void> {
    const { saved, draft } = this.state;
    const version = this.version;
    const epoch = this.epoch;
    this.set({ saving: true, error: null });
    try {
      const revision = saved.revision;
      if (revision === undefined) {
        throw new ApiError(0, "NO_REVISION", "Нет ревизии для сохранения.");
      }
      const result = await this.saveFn(revision, draft);
      if (epoch !== this.epoch) return;
      const unchanged = version === this.version;
      this.set({
        saved: result,
        ...(unchanged ? { draft: this.toDraft(result) } : {}),
        dirty: !unchanged,
        saving: false,
        error: null,
      });
    } catch (cause) {
      if (epoch !== this.epoch) return;
      const error = toApiError(cause);
      const conflict = error.status === 409 && error.code === "REVISION_CONFLICT";
      if (conflict) this.clearTimer();
      this.set({ saving: false, error, conflict });
      throw error;
    }
  }

  // Правки во время запроса: следующий запрос только после ответа.
  private followUp() {
    if (!this.state.dirty || !this.auto || this.disposed || this.state.conflict) return;
    if (this.wantSave) {
      this.send().catch(() => {});
    } else if (this.timer === undefined) {
      this.schedule();
    }
  }

  async flush(): Promise<void> {
    this.clearTimer();
    this.wantSave = false;
    while (!this.disposed) {
      if (this.inflight) await this.inflight;
      if (this.disposed) return;
      if (this.state.conflict) {
        throw this.state.error ?? new ApiError(409, "REVISION_CONFLICT", "Конфликт версий.");
      }
      if (!this.state.dirty) return;
      await this.send();
    }
  }

  reload(fresh: S) {
    this.epoch++;
    this.clearTimer();
    this.wantSave = false;
    this.set({
      saved: fresh,
      draft: this.toDraft(fresh),
      dirty: false,
      saving: false,
      conflict: false,
      error: null,
    });
  }

  overwrite(fresh: S): Promise<void> {
    this.epoch++;
    this.inflight = null;
    this.clearTimer();
    this.wantSave = false;
    this.set({ saved: fresh, dirty: true, saving: false, conflict: false, error: null });
    return this.send();
  }

  dispose() {
    this.disposed = true;
    this.clearTimer();
    this.wantSave = false;
  }
}
