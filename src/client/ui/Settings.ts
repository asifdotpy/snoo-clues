import { Audio } from '../utils/AudioHelper';

/**
 * Settings UI Handler
 * - Connects to existing DOM elements for settings and mute control.
 * - Manages the visibility of the settings panel.
 * - Syncs the UI state with the AudioManager.
 */
export function setupSettingsUI(): void {
  if (typeof document === 'undefined') return;

  const settingsBtn = document.getElementById('settings-btn') as HTMLButtonElement;
  const settingsPanel = document.getElementById('settings-panel');
  const muteBtn = document.getElementById('mute-btn') as HTMLButtonElement;

  if (!settingsBtn || !settingsPanel || !muteBtn) {
    console.warn('[Settings] Required DOM elements for settings not found');
    return;
  }

  const updateMuteLabel = () => {
    const isMuted = Audio.isMuted();
    muteBtn.textContent = isMuted ? '🔇 Muted' : '🔊 Sound On';
    muteBtn.classList.toggle('muted', isMuted);
  };

  muteBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    Audio.toggleMuted();
    updateMuteLabel();
  });

  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isHidden = settingsPanel.classList.contains('hidden');

    // Toggle panel
    if (isHidden) {
      settingsPanel.classList.remove('hidden');
      updateMuteLabel();
    } else {
      settingsPanel.classList.add('hidden');
    }
  });

  // Close panel when clicking outside
  document.addEventListener('click', (e) => {
    if (!settingsPanel.classList.contains('hidden') &&
        !settingsPanel.contains(e.target as Node) &&
        e.target !== settingsBtn) {
      settingsPanel.classList.add('hidden');
    }
  });

  // Initial UI sync
  updateMuteLabel();

  // Sync Audio context and GameMaker state on first interaction
  Audio.sync();
}

export default setupSettingsUI;
