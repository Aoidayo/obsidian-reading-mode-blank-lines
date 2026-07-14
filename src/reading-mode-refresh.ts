export interface RefreshableReadingView {
  getMode(): string;
  previewMode: {
    rerender(full?: boolean): void;
  };
}

export class ReadingModeRefreshCoordinator<T extends RefreshableReadingView> {
  private readonly dirtyViews = new Set<T>();

  constructor(private readonly getActiveView: () => T | null) {}

  markViewDirty(view: T): void {
    this.dirtyViews.add(view);
  }

  refreshDirtyActiveView(): void {
    const view = this.getActiveView();
    if (!view || view.getMode() !== 'preview' || !this.dirtyViews.has(view)) {
      return;
    }

    this.dirtyViews.delete(view);
    view.previewMode.rerender(true);
  }
}
