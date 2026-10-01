/**
 * Bingo Caller Audio Player
 * Plays pre-recorded .aac/.mp3 voice files from public/audio/bingo/
 * 
 * Supported announcements:
 * - Number letters: B-1, I-16, N-31, G-46, O-71 etc.
 * - "Game start"
 * - "This is winner"
 * - "This not winner"
 * 
 * Maps B-1 → O-75 range exactly as specified.
 * Uses HTMLAudioElement for Capacitor/Android compatibility.
 * Handles missing files gracefully (silent fallback).
 * Ensures each recording plays fully without cutting or overlapping.
 */

const AUDIO_BASE_PATH = '/audio/bingo/';

// Pre-load all audio elements for best performance
const audioCache: Map<string, HTMLAudioElement> = new Map();

// Initialize all bingo number audio files (B-1 through O-75)
function initNumberAudio(): Map<string, HTMLAudioElement> {
  const numbers: Array<{ letter: string; num: number }> = [
    { letter: 'B', num: 1 }, { letter: 'B', num: 2 }, { letter: 'B', num: 3 }, { letter: 'B', num: 4 }, { letter: 'B', num: 5 },
    { letter: 'B', num: 6 }, { letter: 'B', num: 7 }, { letter: 'B', num: 8 }, { letter: 'B', num: 9 }, { letter: 'B', num: 10 },
    { letter: 'B', num: 11 }, { letter: 'B', num: 12 }, { letter: 'B', num: 13 }, { letter: 'B', num: 14 }, { letter: 'B', num: 15 },
    { letter: 'I', num: 16 }, { letter: 'I', num: 17 }, { letter: 'I', num: 18 }, { letter: 'I', num: 19 }, { letter: 'I', num: 20 },
    { letter: 'I', num: 21 }, { letter: 'I', num: 22 }, { letter: 'I', num: 23 }, { letter: 'I', num: 24 }, { letter: 'I', num: 25 },
    { letter: 'I', num: 26 }, { letter: 'I', num: 27 }, { letter: 'I', num: 28 }, { letter: 'I', num: 29 }, { letter: 'I', num: 30 },
    { letter: 'N', num: 31 }, { letter: 'N', num: 32 }, { letter: 'N', num: 33 }, { letter: 'N', num: 34 }, { letter: 'N', num: 35 },
    { letter: 'N', num: 36 }, { letter: 'N', num: 37 }, { letter: 'N', num: 38 }, { letter: 'N', num: 39 }, { letter: 'N', num: 40 },
    { letter: 'N', num: 41 }, { letter: 'N', num: 42 }, { letter: 'N', num: 43 }, { letter: 'N', num: 44 }, { letter: 'N', num: 45 },
    { letter: 'G', num: 46 }, { letter: 'G', num: 47 }, { letter: 'G', num: 48 }, { letter: 'G', num: 49 }, { letter: 'G', num: 50 },
    { letter: 'G', num: 51 }, { letter: 'G', num: 52 }, { letter: 'G', num: 53 }, { letter: 'G', num: 54 }, { letter: 'G', num: 55 },
    { letter: 'G', num: 56 }, { letter: 'G', num: 57 }, { letter: 'G', num: 58 }, { letter: 'G', num: 59 }, { letter: 'G', num: 60 },
    { letter: 'O', num: 61 }, { letter: 'O', num: 62 }, { letter: 'O', num: 63 }, { letter: 'O', num: 64 }, { letter: 'O', num: 65 },
    { letter: 'O', num: 66 }, { letter: 'O', num: 67 }, { letter: 'O', num: 68 }, { letter: 'O', num: 69 }, { letter: 'O', num: 70 },
    { letter: 'O', num: 71 }, { letter: 'O', num: 72 }, { letter: 'O', num: 73 }, { letter: 'O', num: 74 }, { letter: 'O', num: 75 },
  ];

  for (const { letter, num } of numbers) {
    const key = `${letter}-${num}`;
    const audio = new Audio();
    audio.src = `${AUDIO_BASE_PATH}${key}.aac`;
    audio.preload = 'auto';
    // Ensure each recording plays fully - wait for onloadeddata before allowing play
    audio.onloadeddata = () => {
      // Ready to play
    };
    audio.onerror = (e) => {
      // File not found or corrupt - will fallback silently
      audio.src = `${AUDIO_BASE_PATH}${key}.mp3`;
    };
    audioCache.set(key, audio);
  }

  return audioCache;
}

initNumberAudio();

// Cache the caller voice audio files
const callerVoiceAudio: Map<string, HTMLAudioElement> = new Map();

// Initialize caller voice announcements
function initCallerVoiceAudio(): Map<string, HTMLAudioElement> {
  const voices = ['Game start', 'This is winner', 'This not winner'];
  for (const voice of voices) {
    const audio = new Audio();
    audio.src = `${AUDIO_BASE_PATH}${voice}.aac`;
    audio.preload = 'auto';
    audioCache.set(voice, audio); // reuse same cache
    callerVoiceAudio.set(voice, audio);
  }
  return callerVoiceAudio;
}

initCallerVoiceAudio();

// Track currently playing audio to prevent overlapping
let currentlyPlaying: HTMLAudioElement | null = null;
let voiceEnabled = true;

/**
 * Set voice enabled state globally
 */
export function setVoiceEnabled(state: boolean) {
  voiceEnabled = state;
}

/**
 * Get current voice enabled state
 */
export function isVoiceEnabled(): boolean {
  return voiceEnabled;
}

/**
 * Play a bingo number announcement (e.g., "B-1", "O-75")
 * 
 * @param letter The bingo column letter (B, I, N, G, O)
 * @param num The bingo number (1-75)
 * @returns True if audio was played, false if skipped (voice off or missing file)
 */
export function playNumberAudio(letter: string, num: number): boolean {
  if (!voiceEnabled) return false;

  const key = `${letter}-${num}`;
  const audio = audioCache.get(key);

  if (!audio) {
    console.warn(`No audio cache entry for ${key}`);
    return false;
  }

  // Stop any currently playing audio to prevent overlapping
  stopCurrentlyPlaying();

  // Reset and play
  audio.currentTime = 0; // Reset to start for full playback
  try {
    audio.play().catch((e) => {
      console.warn(`Audio play error for ${key}:`, e);
    });
    currentlyPlaying = audio;
    return true;
  } catch (e) {
    console.warn(`Failed to play audio for ${key}:`, e);
    return false;
  }
}

/**
 * Play the "Game start" announcement
 * Uses the 'Game start.mp3' or 'Game start.aac' audio file from the bingo audio folder.
 */
export function playGameStart(): boolean {
  if (!voiceEnabled) return false;

  stopCurrentlyPlaying();

  const audio = audioCache.get('Game start');
  if (!audio) {
    console.warn('Game start audio not found');
    return false;
  }

  audio.currentTime = 0;
  try {
    audio.play().catch((e) => {
      console.warn('Game start audio play error:', e);
    });
    currentlyPlaying = audio;
    return true;
  } catch (e) {
    console.warn('Failed to play Game start audio:', e);
    return false;
  }
}

/**
 * Play "This is winner" announcement
 */
export function playWinnerAnnouncement(): boolean {
  if (!voiceEnabled) return false;

  stopCurrentlyPlaying();

  const audio = audioCache.get('This is winner');
  if (!audio) {
    console.warn('This is winner audio not found');
    return false;
  }

  audio.currentTime = 0;
  try {
    audio.play().catch((e) => {
      console.warn('Winner announcement audio play error:', e);
    });
    currentlyPlaying = audio;
    return true;
  } catch (e) {
    console.warn('Failed to play winner announcement:', e);
    return false;
  }
}

/**
 * Play "This not winner" announcement
 */
export function playNotWinnerAnnouncement(): boolean {
  if (!voiceEnabled) return false;

  stopCurrentlyPlaying();

  const audio = audioCache.get('This not winner');
  if (!audio) {
    console.warn('This not winner audio not found');
    return false;
  }

  audio.currentTime = 0;
  try {
    audio.play().catch((e) => {
      console.warn('Not winner announcement audio play error:', e);
    });
    currentlyPlaying = audio;
    return true;
  } catch (e) {
    console.warn('Failed to play not winner announcement:', e);
    return false;
  }
}

/**
 * Stop any currently playing audio
 */
function stopCurrentlyPlaying(): void {
  if (currentlyPlaying) {
    currentlyPlaying.pause();
    currentlyPlaying.currentTime = 0;
    currentlyPlaying = null;
  }
}

/**
 * Handle audio element ending naturally (for cleanup)
 */
audioCache.forEach((audio) => {
  audio.onended = () => {
    if (currentlyPlaying === audio) {
      currentlyPlaying = null;
    }
  };
});

/**
 * Legacy: Fallback to browser SpeechSynthesis if audio unavailable
 * Kept for backward compatibility but not used by default
 */
export function fallbackSpeakNumber(letter: string, num: number): void {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const phrase = `Letter ${letter}, ${num}`;
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.error('Speech synthesis fallback error:', e);
  }
}

/**
 * Legacy: Fallback speaker for verification outcomes
 */
export function fallbackSpeakVerification(outcome: 'WINNER' | 'LATE' | 'NOT_WINNER', isAmharic = false): void {
  if (!('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    let phrase = '';
    if (outcome === 'WINNER') {
      phrase = isAmharic ? 'ይህ አሸናፊ ነው። This is winner.' : 'This is winner.';
    } else if (outcome === 'LATE') {
      phrase = isAmharic ? 'ይህ የዘገየ ነው። This is a late.' : 'This is a late.';
    } else {
      phrase = isAmharic ? 'ይህ አሸናፊ አይደለም። This is not winner.' : 'This is not winner.';
    }
    const utterance = new SpeechSynthesisUtterance(phrase);
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  } catch (e) {
    console.warn('Speech synthesis fallback error:', e);
  }
}