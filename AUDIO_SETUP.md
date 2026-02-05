# Audio System Setup

## Current Implementation

The Snoo Clues game now uses a hybrid audio system:

### 1. Synth Sound Effects (Web Audio API)
**No external files needed** - Generated using the browser's built-in Web Audio API.

- **Hit sound** (correct guess): 800 Hz for 150ms - bright chime
- **Wrong sound** (incorrect guess): 300 Hz for 200ms - low beep

### 2. Background Music (Optional)
Currently not registered. To add:

```typescript
// In src/client/main.ts setupAudioAndSettings()
Audio.registerMusic('https://example-cdn.com/background-music.mp3');
```

## Free Music Resources

Choose one and add the URL to `setupAudioAndSettings()`:

### Freepd.com
- Thousands of CC0 tracks
- No login required
- Direct download/CDN links
- Example: https://cdn.freepd.com/music/... (varies by track)

### Zapsplat
- Huge SFX library
- Free download
- Register once, then download

### Pixabay Music
- 400+ CC0 tracks
- Direct links available
- https://pixabay.com/music/

## Adding Custom Audio

### Option 1: Use CDN URL (Recommended)
```typescript
Audio.registerMusic('https://your-cdn.com/music.mp3');
// or
Audio.registerSound('custom', 'https://your-cdn.com/sound.mp3');
```

### Option 2: Generate Custom Synth Sounds
```typescript
// Custom frequencies
Audio.registerSynth('name', 440, 100); // 440Hz for 100ms
```

Common frequencies:
- C4: 262 Hz
- E4: 330 Hz
- A4: 440 Hz
- C5: 523 Hz
- A5: 880 Hz

## Testing Audio

1. Open DevTools → Console
2. Type: `Audio.playSound('hit')` - should hear a chime
3. Type: `Audio.playSound('wrong')` - should hear a low beep
4. Type: `Audio.toggleMuted()` - sounds should mute/unmute
5. Check localStorage: `localStorage.getItem('snoo_audio_muted')`

## Troubleshooting

### No sound in Safari/iOS
- iOS requires user gesture before first audio playback
- Mute toggle should trigger audio context resume on next interaction
- Check browser console for Audio Context state

### No sound after muting/unmuting
- Settings panel shows current mute state with 🔊/🔇 icons
- Toggle the mute button in the settings gear ⚙️ in top-right

### Web Audio API Issues
- Check DevTools → Console for errors
- Verify AudioContext state: `Audio.audioContext.state`
- Some browsers require user interaction before AudioContext resumes

## Performance Notes

- Synth sounds are zero-latency (no network/file loading)
- Music loading doesn't block gameplay
- All audio respects user's mute preference
- localStorage is used for persistence (cross-session)

## Future Enhancements

- [ ] Volume slider (not just mute)
- [ ] Sound type selection (chiptune vs realistic)
- [ ] Music selection from Freepd API
- [ ] Custom sound for different game events
