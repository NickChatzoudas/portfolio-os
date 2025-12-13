import { useState, useEffect, useCallback } from "react";

// Grid configuration (must match your generation parameters)
const P_MIN = -15;
const P_MAX = 15;
const STEP = 3;
const SIZE = 256;

/**
 * Converts normalized coordinates [-1, 1] to grid coordinates
 */
function quantizeToGrid(val: number) {
  const raw = P_MIN + ((val + 1) * (P_MAX - P_MIN)) / 2; // [-1,1] -> [-15,15]
  const snapped = Math.round(raw / STEP) * STEP;
  return Math.max(P_MIN, Math.min(P_MAX, snapped));
}

/**
 * Converts grid coordinates to filename format
 */
function gridToFilename(px: number, py: number) {
  const sanitize = (val: number) =>
    val.toFixed(1).replace("-", "m").replace(".", "p");
  return `gaze_px${sanitize(px)}_py${sanitize(py)}_${SIZE}.webp`;
}

export type GazeTile = {
  tileX: number; // 0..10
  tileY: number; // 0..10
  px: number;
  py: number;
};

/**
 * Custom hook for gaze tracking
 * @param {React.RefObject} containerRef - Reference to the container element
 * @param {string} basePath - Base path to face images (default: '/faces/')
 * @returns {Object} { currentImage, isLoading, error }
 */
export function useGazeTracking(
  containerRef: React.RefObject<HTMLElement | null>,
  basePath = "/faces/"
) {
  void basePath; // basePath kept for API compatibility; atlas is addressed by the component.

  const [tile, setTile] = useState<GazeTile | null>(null);
  const [isLoading] = useState(false);
  const [error] = useState<Error | null>(null);

  const updateGaze = useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      // Convert to normalized coordinates [-1, 1]
      const nx = (clientX - centerX) / (rect.width / 2);
      // Screen Y grows downward; our gaze Y (pupil_y) grows upward.
      const ny = -(clientY - centerY) / (rect.height / 2);

      // Clamp to [-1, 1] range
      const clampedX = Math.max(-1, Math.min(1, nx));
      const clampedY = Math.max(-1, Math.min(1, ny));

      // Convert to grid coordinates
      const px = quantizeToGrid(clampedX);
      const py = quantizeToGrid(clampedY);

      const tileX = Math.round((px - P_MIN) / STEP);
      const tileY = Math.round((py - P_MIN) / STEP);

      // Keep filename generation logic around for parity/debugging.
      void gridToFilename(px, py);

      setTile({ tileX, tileY, px, py });
    },
    [containerRef]
  );

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      updateGaze(e.clientX, e.clientY);
    },
    [updateGaze]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0];
        updateGaze(touch.clientX, touch.clientY);
      }
    },
    [updateGaze]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Track globally so the face follows the cursor anywhere on the page.
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("touchmove", handleTouchMove, { passive: true });

    // Set initial center gaze once mounted.
    const container = containerRef.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      updateGaze(centerX, centerY);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [handleMouseMove, handleTouchMove, updateGaze]);

  return { tile, isLoading, error };
}

export default useGazeTracking;
