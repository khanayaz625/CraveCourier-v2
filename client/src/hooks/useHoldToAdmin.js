import { useRef, useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook to detect a press-and-hold (long-press) on the account section before login,
 * redirecting smoothly to the Craved Admin Login Portal (/admin/login).
 *
 * @param {Object} options
 * @param {number} options.durationMs - Duration in milliseconds required to trigger (default: 1500ms)
 * @param {Function} options.onHoldComplete - Optional callback invoked right before redirect
 * @returns {Object} { isHolding, progress, holdProps }
 */
export function useHoldToAdmin({ durationMs = 1500, onHoldComplete } = {}) {
  const navigate = useNavigate();
  const [isHolding, setIsHolding] = useState(false);
  const [progress, setProgress] = useState(0);

  const timerRef = useRef(null);
  const intervalRef = useRef(null);
  const isTriggeredRef = useRef(false);
  const startTimeRef = useRef(0);

  const cancelHold = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsHolding(false);
    setProgress(0);
  }, []);

  const triggerAdminRedirect = useCallback(() => {
    isTriggeredRef.current = true;
    cancelHold();

    // Haptic feedback on supported mobile devices
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([60, 40, 80]);
      } catch (_) {}
    }

    if (onHoldComplete) {
      onHoldComplete();
    }

    navigate('/admin/login');
  }, [cancelHold, navigate, onHoldComplete]);

  const startHold = useCallback(
    (e) => {
      // Ignore secondary mouse clicks (right click, middle click)
      if (e.button && e.button !== 0) return;

      isTriggeredRef.current = false;
      setIsHolding(true);
      setProgress(5);
      startTimeRef.current = Date.now();

      // Update progress animation every 30ms
      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const currentProgress = Math.min(100, Math.round((elapsed / durationMs) * 100));
        setProgress(currentProgress);
      }, 30);

      // Trigger redirect upon full duration
      timerRef.current = setTimeout(() => {
        triggerAdminRedirect();
      }, durationMs);
    },
    [durationMs, triggerAdminRedirect]
  );

  const handleClick = useCallback((e) => {
    // If redirect was triggered by long-press, suppress the standard click navigation
    if (isTriggeredRef.current) {
      e.preventDefault();
      e.stopPropagation();
      isTriggeredRef.current = false;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return {
    isHolding,
    progress,
    holdProps: {
      onMouseDown: startHold,
      onMouseUp: cancelHold,
      onMouseLeave: cancelHold,
      onTouchStart: startHold,
      onTouchEnd: cancelHold,
      onTouchCancel: cancelHold,
      onClick: handleClick,
      onContextMenu: (e) => {
        if (isTriggeredRef.current || isHolding) {
          e.preventDefault();
        }
      },
      style: {
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
      },
    },
  };
}
