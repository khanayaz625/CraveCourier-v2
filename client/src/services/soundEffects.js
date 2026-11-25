/**
 * Real-Time Audio Notification & Sound Effects Engine for Crave
 * Built with Web Audio API for zero-latency, cross-browser, zero-dependency sound synthesis.
 */

// Global singleton AudioContext
let audioContextInstance = null;

// LocalStorage Keys
const SOUND_ENABLED_KEY = 'crave_notification_sound_enabled';
const SOUND_VOLUME_KEY = 'crave_notification_sound_volume';

/**
 * Get or initialize the AudioContext lazily.
 */
export const getAudioContext = () => {
  if (typeof window === 'undefined') return null;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return null;

    if (!audioContextInstance || audioContextInstance.state === 'closed') {
      audioContextInstance = new AudioCtx();
    }

    if (audioContextInstance.state === 'suspended') {
      audioContextInstance.resume().catch(() => {});
    }

    return audioContextInstance;
  } catch (err) {
    console.warn('[AUDIO CONTEXT ERROR]', err);
    return null;
  }
};

/**
 * Automatically unlock browser audio on first user interaction
 */
export const unlockAudio = () => {
  const ctx = getAudioContext();
  if (ctx && ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }
  return ctx;
};

if (typeof window !== 'undefined') {
  const unlockAudioOnGesture = () => {
    unlockAudio();
    window.removeEventListener('pointerdown', unlockAudioOnGesture);
    window.removeEventListener('click', unlockAudioOnGesture);
    window.removeEventListener('touchstart', unlockAudioOnGesture);
    window.removeEventListener('keydown', unlockAudioOnGesture);
  };

  window.addEventListener('pointerdown', unlockAudioOnGesture, { passive: true });
  window.addEventListener('click', unlockAudioOnGesture, { passive: true });
  window.addEventListener('touchstart', unlockAudioOnGesture, { passive: true });
  window.addEventListener('keydown', unlockAudioOnGesture, { passive: true });
}

/**
 * Check if sound notifications are enabled by the user
 */
export const isSoundEnabled = () => {
  if (typeof window === 'undefined') return true;
  const val = localStorage.getItem(SOUND_ENABLED_KEY);
  return val === null ? true : val === 'true';
};

/**
 * Toggle sound notifications on / off
 */
export const toggleSoundEnabled = () => {
  if (typeof window === 'undefined') return true;
  const current = isSoundEnabled();
  const next = !current;
  localStorage.setItem(SOUND_ENABLED_KEY, String(next));
  if (next) {
    playGenericNotificationSound();
  }
  return next;
};

/**
 * Get current volume (0.0 to 1.0)
 */
export const getSoundVolume = () => {
  if (typeof window === 'undefined') return 0.8;
  const val = localStorage.getItem(SOUND_VOLUME_KEY);
  return val ? parseFloat(val) : 0.8;
};

/**
 * Helper to play a single tone
 */
const playTone = (ctx, freq, startTime, duration, type = 'sine', gainLevel = 0.1) => {
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + startTime);

    const masterVolume = getSoundVolume();
    const targetGain = Math.max(0.001, gainLevel * masterVolume);

    gain.gain.setValueAtTime(targetGain, ctx.currentTime + startTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      ctx.currentTime + startTime + duration
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(ctx.currentTime + startTime);
    osc.stop(ctx.currentTime + startTime + duration);
  } catch (err) {
    // Autoplay restrictions or audio error
  }
};

// Debounce rapid duplicate sound requests (e.g. simultaneous socket & notification events)
let lastPlayedTime = 0;
let lastPlayedSoundKey = '';

const isDebounced = (key, delay = 250) => {
  const now = Date.now();
  if (lastPlayedSoundKey === key && now - lastPlayedTime < delay) {
    return true;
  }
  lastPlayedTime = now;
  lastPlayedSoundKey = key;
  return false;
};

/**
 * 1. ADMIN SOUND: Cha-Ching / Cash Register + Store Bell
 * Played when a customer places a new order on Crave.
 */
export const playAdminNewOrderSound = () => {
  if (!isSoundEnabled() || isDebounced('admin_new_order', 300)) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Metallic coin clinks
    playTone(ctx, 1950, 0, 0.05, 'triangle', 0.12);
    playTone(ctx, 2400, 0.03, 0.06, 'triangle', 0.15);

    // Rich Ascending Store Bell Triad: C5 (523Hz) -> E5 (659Hz) -> G5 (784Hz) -> C6 (1046Hz)
    playTone(ctx, 523.25, 0.08, 0.22, 'sine', 0.14);
    playTone(ctx, 659.25, 0.16, 0.25, 'sine', 0.15);
    playTone(ctx, 783.99, 0.24, 0.28, 'sine', 0.16);
    playTone(ctx, 1046.5, 0.32, 0.55, 'sine', 0.18);
  } catch (e) {}
};

/**
 * 2. DELIVERY PARTNER SOUND: Urgent Courier Alert / Double Chirp
 * Played when a new delivery request is incoming or ready for pickup.
 */
export const playDeliveryAlertSound = () => {
  if (!isSoundEnabled() || isDebounced('delivery_alert', 300)) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    // Rapid high-frequency double chirp designed for couriers on the road
    playTone(ctx, 880, 0, 0.12, 'triangle', 0.18);
    playTone(ctx, 1174.66, 0.08, 0.16, 'sine', 0.2);

    playTone(ctx, 880, 0.22, 0.12, 'triangle', 0.18);
    playTone(ctx, 1318.51, 0.3, 0.35, 'sine', 0.22);
  } catch (e) {}
};

/**
 * 3. CUSTOMER SOUND: Order Placed / Confirmed
 * Warm, reassuring 3-tone ascending chime.
 */
export const playCustomerOrderPlacedSound = () => {
  if (!isSoundEnabled() || isDebounced('order_placed', 300)) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    playTone(ctx, 587.33, 0, 0.18, 'sine', 0.14);     // D5
    playTone(ctx, 739.99, 0.12, 0.22, 'sine', 0.15);   // F#5
    playTone(ctx, 880.0, 0.24, 0.45, 'sine', 0.18);    // A5
  } catch (e) {}
};

/**
 * 4. EVENT SOUND: Real-time Order Status Updates
 * Plays tailored tones according to the current stage of the order.
 */
export const playStatusUpdateSound = (status) => {
  if (!isSoundEnabled() || isDebounced(`status_${status}`, 300)) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    switch (status) {
      case 'placed':
        playCustomerOrderPlacedSound();
        break;

      case 'confirmed':
        // Bright confirmation chime: G5 -> C6
        playTone(ctx, 783.99, 0, 0.15, 'sine', 0.14);
        playTone(ctx, 1046.5, 0.12, 0.35, 'sine', 0.18);
        break;

      case 'preparing':
        // Gentle cooking chime: E5 -> G#5
        playTone(ctx, 659.25, 0, 0.15, 'sine', 0.12);
        playTone(ctx, 830.61, 0.12, 0.28, 'sine', 0.15);
        break;

      case 'ready':
        // Ready for pickup: F5 -> A5 -> C6
        playTone(ctx, 698.46, 0, 0.14, 'sine', 0.14);
        playTone(ctx, 880.0, 0.11, 0.16, 'sine', 0.16);
        playTone(ctx, 1046.5, 0.22, 0.38, 'sine', 0.18);
        break;

      case 'picked_up':
        // Bike bell double ding (B5 987Hz)
        playTone(ctx, 987.77, 0, 0.08, 'triangle', 0.16);
        playTone(ctx, 987.77, 0.11, 0.2, 'triangle', 0.18);
        break;

      case 'out_for_delivery':
        // Energetic 3-note sprint: D5 -> G5 -> B5 -> D6
        playTone(ctx, 587.33, 0, 0.12, 'sine', 0.14);
        playTone(ctx, 783.99, 0.09, 0.14, 'sine', 0.16);
        playTone(ctx, 987.77, 0.18, 0.18, 'sine', 0.18);
        playTone(ctx, 1174.66, 0.28, 0.45, 'sine', 0.2);
        break;

      case 'delivered':
        // Celebratory 5-note fanfare
        playTone(ctx, 523.25, 0, 0.14, 'sine', 0.14);     // C5
        playTone(ctx, 659.25, 0.1, 0.14, 'sine', 0.15);    // E5
        playTone(ctx, 783.99, 0.2, 0.16, 'sine', 0.17);    // G5
        playTone(ctx, 1046.5, 0.3, 0.22, 'sine', 0.19);    // C6
        playTone(ctx, 1318.51, 0.42, 0.65, 'sine', 0.22);  // E6
        break;

      case 'cancelled':
      case 'refunded':
        // Descending warning alert
        playTone(ctx, 659.25, 0, 0.15, 'sine', 0.16);
        playTone(ctx, 523.25, 0.12, 0.18, 'sine', 0.16);
        playTone(ctx, 440.0, 0.26, 0.4, 'sine', 0.14);
        break;

      default:
        playGenericNotificationSound();
        break;
    }
  } catch (e) {}
};

/**
 * 5. GENERIC NOTIFICATION SOUND: Crisp 2-tone melodic chime
 */
export const playGenericNotificationSound = () => {
  if (!isSoundEnabled() || isDebounced('generic_notification', 300)) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    playTone(ctx, 659.25, 0, 0.15, 'sine', 0.12);
    playTone(ctx, 830.61, 0.12, 0.28, 'sine', 0.15);
  } catch (e) {}
};

/**
 * Play appropriate sound based on notification metadata
 */
export const playNotificationSoundForEvent = (notification) => {
  if (!notification) {
    playGenericNotificationSound();
    return;
  }

  const type = notification.type || '';
  const status = notification.data?.status || '';

  if (type === 'admin_new_order') {
    playAdminNewOrderSound();
  } else if (type === 'delivery_assignment' || type === 'order_incoming') {
    playDeliveryAlertSound();
  } else if (status) {
    playStatusUpdateSound(status);
  } else if (type === 'order_update') {
    playCustomerOrderPlacedSound();
  } else {
    playGenericNotificationSound();
  }
};
