export class RenderLoop {
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private isBaseDirty: boolean = true;
  private isOverlayDirty: boolean = true;

  constructor(
    private renderBase: () => void,
    private renderOverlay: () => void
  ) {}

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.loop();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  requestBaseRender(): void {
    this.isBaseDirty = true;
  }

  requestOverlayRender(): void {
    this.isOverlayDirty = true;
  }

  requestAll(): void {
    this.isBaseDirty = true;
    this.isOverlayDirty = true;
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    if (this.isBaseDirty) {
      this.renderBase();
      this.isBaseDirty = false;
    }

    if (this.isOverlayDirty) {
      this.renderOverlay();
      this.isOverlayDirty = false;
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };
}
