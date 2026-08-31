// Short taps survive a 20Hz movement sample without reads consuming them.
// The revision identifies physical presses even when their latch windows overlap.
const KEY_JUMP_LATCH_MS = 150;
const TAP_JUMP_LATCH_MS = 220;

export class JumpInput {
  private readonly heldKeys = new Set<string>();
  private keyUntil = Number.NEGATIVE_INFINITY;
  private tapUntil = Number.NEGATIVE_INFINITY;
  private pressRevision = 0;
  private pressBase = 0;

  get revision(): number {
    return this.pressRevision;
  }

  pressKey(code: string, now: number): void {
    if (this.heldKeys.has(code)) return;
    this.heldKeys.add(code);
    this.advanceRevision();
    this.keyUntil = Math.max(this.keyUntil, now + KEY_JUMP_LATCH_MS);
  }

  releaseKey(code: string): void {
    this.heldKeys.delete(code);
  }

  /** Touch and gamepad callers already dispatch one callback per physical press. */
  pressTap(now: number): void {
    this.advanceRevision();
    this.tapUntil = Math.max(this.tapUntil, now + TAP_JUMP_LATCH_MS);
  }

  read(
    now: number,
    keyHeld: boolean,
  ): { jump: boolean; jumpPress: number | undefined; jumpPressBase: number | undefined } {
    const jump = keyHeld || now <= this.keyUntil || now <= this.tapUntil;
    // Callers reuse movement bags with Object.assign, so neutral must erase an old token.
    return {
      jump,
      jumpPress: jump ? this.pressRevision : undefined,
      jumpPressBase: jump ? this.pressBase : undefined,
    };
  }

  /** Drop pending intent, never rewind the revision and reuse an earlier press. */
  clear(): void {
    this.pressBase = this.pressRevision;
    this.heldKeys.clear();
    this.keyUntil = Number.NEGATIVE_INFINITY;
    this.tapUntil = Number.NEGATIVE_INFINITY;
  }

  private advanceRevision(): void {
    this.pressRevision = (this.pressRevision + 1) & 0xffff;
    // Keep the cancellation floor within half a sequence cycle. Ancient input
    // cannot matter to a two-jump budget, and an old floor must not hide a
    // pair of fresh presses straddling uint16 wrap.
    if (((this.pressRevision - this.pressBase + 65536) & 0xffff) > 32767)
      this.pressBase = (this.pressRevision - 32767 + 65536) & 0xffff;
  }
}
