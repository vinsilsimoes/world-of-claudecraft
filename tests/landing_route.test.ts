import { describe, expect, it } from 'vitest';
import { initialLandingView } from '../src/game/landing_route';

describe('initialLandingView', () => {
  it('opens the published Windows download surface from its canonical URL', () => {
    expect(initialLandingView('/download')).toBe('#download-view');
    expect(initialLandingView('/download/')).toBe('#download-view');
  });

  it('leaves ordinary play and authentication routes on their existing boot flow', () => {
    expect(initialLandingView('/')).toBeNull();
    expect(initialLandingView('/play')).toBeNull();
    expect(initialLandingView('/desktop-login')).toBeNull();
  });
});
