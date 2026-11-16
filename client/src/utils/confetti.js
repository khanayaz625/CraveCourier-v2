import confetti from 'canvas-confetti';
import { playCustomerOrderPlacedSound } from '../services/soundEffects';

/**
 * Triggers a multi-colored celebration confetti burst on order success or milestone achievement
 */
export const triggerOrderCelebration = () => {
  // Play joyful order placed celebration chime
  playCustomerOrderPlacedSound();

  const duration = 2.5 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  function randomInRange(min, max) {
    return Math.random() * (max - min) + min;
  }

  const interval = setInterval(function () {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);

    // Warm Food Orange, Leafy Teal Green, Gold, and White
    const colors = ['#FF6B35', '#2EC4B6', '#FFD166', '#06D6A0', '#FFFFFF'];

    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
      colors,
    });
    confetti({
      ...defaults,
      particleCount,
      origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
      colors,
    });
  }, 250);
};

