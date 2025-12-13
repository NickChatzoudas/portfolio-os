import { useMemo, useRef, useState } from 'react';
import useGazeTracking from './useGazeTracking';
import './FaceTracker.css'; // Optional styling

/**
 * FaceTracker Component
 * Displays a face that follows mouse/touch movement
 */
type FaceTrackerProps = {
  className?: string;
  basePath?: string;
  showDebug?: boolean;
};

export default function FaceTracker({
  className = '',
  basePath = `${import.meta.env.BASE_URL}faces/`,
  showDebug = false
}: FaceTrackerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { currentImage, isLoading, error } = useGazeTracking(containerRef, basePath);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [imgError, setImgError] = useState<string | null>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const resolvedSrc = useMemo(() => {
    if (!currentImage) return null;

    // Normalize windows slashes coming from CSV/paths: "faces\1.png" -> "faces/1.png"
    const normalized = currentImage.replace(/\\/g, '/').trim();

    // If hook returns just a filename, make it absolute under basePath.
    const isAbsolute =
      normalized.startsWith('/') ||
      normalized.startsWith('http://') ||
      normalized.startsWith('https://') ||
      normalized.startsWith('data:');

    const joined = isAbsolute ? normalized : `${basePath}${normalized}`;

    // Avoid accidental double slashes (except after protocol)
    const cleaned = joined.replace(/([^:]\/)\/+/g, '$1');

    return encodeURI(cleaned);
  }, [currentImage, basePath]);

  if (error) {
    return (
      <div className="face-tracker-error">
        Error loading face images: {error.message}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`face-tracker ${className}`}
      onMouseMove={handleMouseMove}
    >
      {resolvedSrc && (
        <img
          src={resolvedSrc}
          alt="Face following gaze"
          className="face-image"
          onLoad={() => setImgError(null)}
          onError={() => setImgError(resolvedSrc)}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            transition: 'opacity 0.1s ease-out'
          }}
        />
      )}

      {isLoading && (
        <div className="face-loading">
          Loading face...
        </div>
      )}

      {(showDebug || imgError) && (
        <div className="face-debug">
          <div>Mouse: ({Math.round(mousePos.x)}, {Math.round(mousePos.y)})</div>
          <div>currentImage: {String(currentImage)}</div>
          <div>resolvedSrc: {String(resolvedSrc)}</div>
          {imgError && <div style={{ color: '#ff8080' }}>IMG failed: {imgError}</div>}
        </div>
      )}
    </div>
  );
}
