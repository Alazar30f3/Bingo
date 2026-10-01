/**
 * Sound synthesizer & Speech Announcement for Bingo Card Verification
 * Supports:
 * - Winner: "This is winner"
 * - Late: "This is a late"
 * - Not Winner: "This is not winner"
 */

export type VerificationOutcome = 'WINNER' | 'LATE' | 'NOT_WINNER';

/**
 * Produces an instant Web Audio tone for the result
 */
export function playVerificationAudioTone(outcome: VerificationOutcome) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    if (outcome === 'WINNER') {
      // Ascending triumphant chime
      const freqs = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.1);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + idx * 0.1 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.1 + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.1);
        osc.stop(ctx.currentTime + idx * 0.1 + 0.28);
      });
    } else if (outcome === 'LATE') {
      // Amber alert double tone
      const freqs = [659.25, 523.25]; // E5, C5
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.14);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.22, ctx.currentTime + idx * 0.14 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.14 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.14);
        osc.stop(ctx.currentTime + idx * 0.14 + 0.25);
      });
    } else {
      // Descending buzzer chime
      const freqs = [349.23, 261.63]; // F4, C4
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.12);
        gain.gain.setValueAtTime(0.001, ctx.currentTime + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.12 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + idx * 0.12);
        osc.stop(ctx.currentTime + idx * 0.12 + 0.22);
      });
    }
  } catch (err) {
    console.warn('Audio tone error:', err);
  }
}

/**
 * Speaks the official result using browser SpeechSynthesis:
 * - Winner: "This is winner"
 * - Late: "This is a late"
 * - Not winner: "This is not winner"
 */
export function speakVerificationOutcome(
  outcome: VerificationOutcome,
  isAmharic = false
) {
  // Play chime tone
  playVerificationAudioTone(outcome);

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
    utterance.pitch = outcome === 'WINNER' ? 1.15 : outcome === 'LATE' ? 0.95 : 0.85;

    // Pick best voice if available
    try {
      const voices = window.speechSynthesis.getVoices();
      if (isAmharic) {
        const amVoice = voices.find((v) => v.lang.toLowerCase().includes('am'));
        if (amVoice) {
          utterance.voice = amVoice;
          utterance.lang = 'am-ET';
        } else {
          utterance.lang = 'en-US';
        }
      } else {
        const enVoice = voices.find((v) => v.lang.startsWith('en') && !v.name.includes('Google'));
        if (enVoice) utterance.voice = enVoice;
        utterance.lang = 'en-US';
      }
    } catch {
      utterance.lang = 'en-US';
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}
