import { Audio } from '../utils/AudioHelper';

/**
 * Minimal settings UI scaffolding.
 * - Adds a floating gear button that toggles a small panel with a mute control.
 * - Does not assume any specific CSS; keep markup and IDs stable for styling.
 */
export function setupSettingsUI(): void {
  if (typeof document === 'undefined') return;

  const existing = document.getElementById('snoo-settings-root');
  if (existing) return;

  const root = document.createElement('div');
  root.id = 'snoo-settings-root';
  root.style.position = 'fixed';
  root.style.right = '12px';
  root.style.top = '12px';
  root.style.zIndex = '9999';

  const btn = document.createElement('button');
  btn.id = 'snoo-settings-btn';
  btn.title = 'Settings';
  btn.textContent = '⚙️';
  btn.style.fontSize = '18px';
  btn.style.padding = '6px';

  const panel = document.createElement('div');
  panel.id = 'snoo-settings-panel';
  panel.style.display = 'none';
  panel.style.marginTop = '8px';
  panel.style.background = 'rgba(0,0,0,0.7)';
  panel.style.color = 'white';
  panel.style.padding = '8px';
  panel.style.borderRadius = '6px';

  const muteBtn = document.createElement('button');
  muteBtn.id = 'snoo-mute-btn';
  muteBtn.style.padding = '6px';

  function updateMuteLabel() {
    muteBtn.textContent = Audio.isMuted() ? '🔇 Muted' : '🔊 Sound On';
  }

  muteBtn.addEventListener('click', () => {
    Audio.toggleMuted();
    updateMuteLabel();
  });

  updateMuteLabel();
  panel.appendChild(muteBtn);

  btn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    updateMuteLabel();
  });

  root.appendChild(btn);
  root.appendChild(panel);
  document.body.appendChild(root);
}

export default setupSettingsUI;
