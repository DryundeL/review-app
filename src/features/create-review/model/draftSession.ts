import type {
  CreateReviewInput,
  ReviewEditorData,
  UpdateReviewInput,
} from "../../../entities/review/model/remote.ts";

type Fields = Pick<CreateReviewInput, "title" | "rating" | "body">;
type Transport = {
  create: (input: CreateReviewInput) => Promise<ReviewEditorData>;
  save: (id: string, input: UpdateReviewInput) => Promise<ReviewEditorData>;
  publish: (id: string, revision: number) => Promise<ReviewEditorData>;
};
export type DraftState = {
  fields: Fields;
  saved: ReviewEditorData | null;
  dirty: boolean;
  saving: boolean;
  conflict: boolean;
  error: unknown;
};

export class DraftSession {
  state: DraftState;
  private version = 0;
  private pending: Promise<void> | null = null;
  private lastRequest = 0;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private listeners = new Set<() => void>();
  private mediaObjectId: string;
  private transport: Transport;
  constructor(
    mediaObjectId: string,
    initial: ReviewEditorData | null,
    transport: Transport,
  ) {
    this.mediaObjectId = mediaObjectId;
    this.transport = transport;
    this.state = {
      fields: initial
        ? { title: initial.title, rating: initial.rating, body: initial.body }
        : { title: "", rating: null, body: "" },
      saved: initial,
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
  snapshot = () => this.state;
  private set(patch: Partial<DraftState>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((listener) => listener());
  }
  change(fields: Partial<Fields>) {
    this.version++;
    this.set({ fields: { ...this.state.fields, ...fields }, dirty: true, error: null });
    this.schedule();
  }
  private schedule(delay = 1000) {
    if (this.disposed || this.state.conflict || this.state.error || !this.state.dirty)
      return;
    clearTimeout(this.timer);
    this.timer = setTimeout(
      () => {
        void this.save().catch(() => {});
      },
      Math.max(delay, this.lastRequest + 2500 - Date.now()),
    );
  }
  save(): Promise<void> {
    if (this.pending) return this.pending;
    if (this.state.conflict || !this.state.dirty || this.disposed)
      return Promise.resolve();
    clearTimeout(this.timer);
    this.pending = this.performSave().finally(() => {
      this.pending = null;
      this.schedule();
    });
    return this.pending;
  }
  private async performSave() {
    const version = this.version;
    const fields = { ...this.state.fields };
    this.set({ saving: true, error: null });
    try {
      // POST may return an existing review without applying our text. Always PUT it afterwards.
      if (!this.state.saved) {
        this.lastRequest = Date.now();
        const created = await this.transport.create({
          mediaObjectId: this.mediaObjectId,
          ...fields,
        });
        this.set({ saved: created });
      }
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, this.lastRequest + 2500 - Date.now())),
      );
      if (this.disposed) return;
      const saved = this.state.saved!;
      this.lastRequest = Date.now();
      const result = await this.transport.save(saved.id, {
        ...fields,
        revision: saved.revision,
      });
      const unchanged = version === this.version;
      this.set({
        saved: result,
        dirty: !unchanged,
        ...(unchanged
          ? { fields: { title: result.title, rating: result.rating, body: result.body } }
          : {}),
      });
    } catch (error) {
      const status = (error as { status?: number })?.status;
      this.set({ error, conflict: status === 409 });
      if (status === 429 && !this.disposed) {
        this.timer = setTimeout(() => {
          this.set({ error: null });
          this.schedule();
        }, 30_000);
      }
      throw error;
    } finally {
      this.set({ saving: false });
    }
  }
  async publish() {
    while (this.state.dirty && !this.state.conflict && !this.disposed) await this.save();
    if (this.disposed || this.state.conflict || !this.state.saved)
      throw new Error("Сначала сохраните обзор.");
    try {
      const result = await this.transport.publish(
        this.state.saved.id,
        this.state.saved.revision,
      );
      this.set({ saved: result });
      return result;
    } catch (error) {
      this.set({ error, conflict: (error as { status?: number })?.status === 409 });
      throw error;
    }
  }
  dispose() {
    this.disposed = true;
    clearTimeout(this.timer);
  }
  resume() {
    this.disposed = false;
    this.schedule();
  }
}
