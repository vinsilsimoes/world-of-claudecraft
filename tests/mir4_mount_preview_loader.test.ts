import { describe, expect, it, vi } from 'vitest';
import { prepareMir4MountPreview } from '../src/ui/mir4_mount_preview_loader';

describe('MIR4 Mount preview lazy loader', () => {
  it('preloads a cold native Mount GLB before allowing the shared turntable to mount', async () => {
    const host = { isConnected: true } as HTMLElement;
    let ready = false;
    const preload = vi.fn(async () => {
      ready = true;
    });

    await expect(
      prepareMir4MountPreview(host, 'mount_valorsteed', 'meadow-courser', {
        presentation: () => ({ visualKey: 'mount_valorsteed', portraitUrl: null }),
        ready: () => ready,
        preload,
      }),
    ).resolves.toBe(true);
    expect(preload).toHaveBeenCalledOnce();
  });

  it('drops a completed load when a rerender detached the original preview host', async () => {
    const host = { isConnected: true } as HTMLElement;
    let finish!: () => void;
    const preload = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const result = prepareMir4MountPreview(host, 'mount_valorsteed', 'meadow-courser', {
      presentation: () => ({ visualKey: 'mount_valorsteed', portraitUrl: null }),
      ready: () => false,
      preload: () => preload,
    });
    (host as { isConnected: boolean }).isConnected = false;
    finish();
    await expect(result).resolves.toBe(false);
  });

  it('drops a completed load when the Mount window closed but its host stayed connected', async () => {
    const host = { isConnected: true } as HTMLElement;
    let active = true;
    let ready = false;
    let finish!: () => void;
    const preload = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const result = prepareMir4MountPreview(
      host,
      'mount_valorsteed',
      'meadow-courser',
      {
        presentation: () => ({ visualKey: 'mount_valorsteed', portraitUrl: null }),
        ready: () => ready,
        preload: async () => {
          await preload;
          ready = true;
        },
      },
      () => active,
    );
    active = false;
    finish();

    await expect(result).resolves.toBe(false);
  });

  it('does not preload a native Mount GLB that is already warm', async () => {
    const preload = vi.fn(async () => {});

    await expect(
      prepareMir4MountPreview(
        { isConnected: true } as HTMLElement,
        'mount_valorsteed',
        'meadow-courser',
        {
          presentation: () => ({ visualKey: 'mount_valorsteed', portraitUrl: null }),
          ready: () => true,
          preload,
        },
      ),
    ).resolves.toBe(true);
    expect(preload).not.toHaveBeenCalled();
  });

  it('fails closed for an identity mismatch or a rejected native asset load', async () => {
    const host = { isConnected: true } as HTMLElement;
    const preload = vi.fn(async () => {
      throw new Error('missing GLB');
    });
    const deps = {
      presentation: () => ({ visualKey: 'mount_grag_bear', portraitUrl: null }),
      ready: () => false,
      preload,
    };

    await expect(
      prepareMir4MountPreview(host, 'mount_valorsteed', 'meadow-courser', deps),
    ).resolves.toBe(false);
    expect(preload).not.toHaveBeenCalled();

    await expect(
      prepareMir4MountPreview(host, 'mount_grag_bear', 'meadow-courser', deps),
    ).resolves.toBe(false);
    expect(preload).toHaveBeenCalledOnce();
  });
});
