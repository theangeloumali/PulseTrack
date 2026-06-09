import {expect, type Locator, type Page} from '@playwright/test';

/**
 * Demo primitives that make a Playwright run look like a real human walkthrough
 * instead of programmatic clicks. Used by every *.demo.spec.ts.
 *
 * Why these exist:
 * - Playwright fires actions with NO visible cursor — to a viewer it reads as
 *   "screenshots", not a flow. installCursor() injects a fake cursor that
 *   follows real mouse events so motion is visible on the recording.
 * - hover-before-click + slow typing + scene pauses give every step a beat.
 */

const CURSOR_ID = '__pulsetrack_demo_cursor__';

/**
 * Inject a visible amber cursor that tracks mousemove / mousedown / mouseup.
 * Runs via addInitScript so it survives every navigation in the test.
 */
export async function installCursor(page: Page): Promise<void> {
  await page.addInitScript((cursorId: string) => {
    const ensure = (): HTMLDivElement | null => {
      if (!document.body) return null;
      const existing = document.getElementById(cursorId);
      if (existing instanceof HTMLDivElement) return existing;
      const dot = document.createElement('div');
      dot.id = cursorId;
      dot.style.position = 'fixed';
      dot.style.top = '0px';
      dot.style.left = '0px';
      dot.style.width = '18px';
      dot.style.height = '18px';
      // Center the dot on the actual pointer coordinate.
      dot.style.marginLeft = '-9px';
      dot.style.marginTop = '-9px';
      dot.style.borderRadius = '9999px';
      dot.style.background = 'rgba(245, 158, 11, 0.45)';
      dot.style.border = '2px solid rgb(245, 158, 11)';
      dot.style.boxShadow = '0 0 12px 4px rgba(245, 158, 11, 0.45)';
      dot.style.zIndex = '2147483647';
      dot.style.pointerEvents = 'none';
      dot.style.transition = 'left 90ms ease-out, top 90ms ease-out, transform 90ms ease-out';
      // Start off-screen until the first real move.
      dot.style.left = '-100px';
      dot.style.top = '-100px';
      document.body.appendChild(dot);
      return dot;
    };

    const onMove = (event: MouseEvent): void => {
      const dot = ensure();
      if (!dot) return;
      dot.style.left = `${event.clientX}px`;
      dot.style.top = `${event.clientY}px`;
    };
    const onDown = (): void => {
      const dot = ensure();
      if (!dot) return;
      dot.style.transform = 'scale(0.6)';
      dot.style.background = 'rgba(245, 158, 11, 0.85)';
    };
    const onUp = (): void => {
      const dot = ensure();
      if (!dot) return;
      dot.style.transform = 'scale(1)';
      dot.style.background = 'rgba(245, 158, 11, 0.45)';
    };

    const attach = (): void => {
      ensure();
      document.addEventListener('mousemove', onMove, true);
      document.addEventListener('mousedown', onDown, true);
      document.addEventListener('mouseup', onUp, true);
    };

    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', attach, {once: true});
    } else {
      attach();
    }
  }, CURSOR_ID);
}

/** Pause so a viewer can register what just happened. */
export async function scenePause(page: Page, ms = 1000): Promise<void> {
  await page.waitForTimeout(ms);
}

/** Smooth cursor travel between sections (20 interpolated steps). */
export async function smoothMoveTo(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.move(x, y, {steps: 20});
}

/** Hover the target (cursor visibly travels) THEN click — never a teleport click. */
export async function humanClick(locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await locator.hover();
  await locator.page().waitForTimeout(280);
  await locator.click();
}

/** Hover, focus, then type character-by-character. Never fill() — fill teleports text. */
export async function typeInto(locator: Locator, text: string, delay = 70): Promise<void> {
  await locator.scrollIntoViewIfNeeded().catch(() => undefined);
  await locator.hover();
  await locator.click();
  await locator.pressSequentially(text, {delay});
}

/** Travel to and click a sidebar nav link by visible name. */
export async function navTo(page: Page, name: string): Promise<void> {
  const link = page.getByRole('link', {name, exact: true}).first();
  await humanClick(link);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await scenePause(page, 800);
}

/** Soft-assert a heading is visible without failing the recording if copy drifts. */
export async function glanceHeading(page: Page, name: RegExp): Promise<void> {
  await expect(page.getByRole('heading', {name}).first())
    .toBeVisible({timeout: 8000})
    .catch(() => undefined);
}
