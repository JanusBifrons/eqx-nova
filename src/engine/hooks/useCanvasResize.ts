import { useEffect, useCallback } from 'react';

/**
 * Custom hook to handle canvas resizing to fit its container
 * @param canvasRef - React ref to the canvas element
 * @param containerRef - React ref to the container element (optional - will use canvas parent if not provided)
 */
export const useCanvasResize = (
  canvasRef: React.RefObject<HTMLCanvasElement | null>,
  containerRef?: React.RefObject<HTMLElement | null>
) => {
  const resizeCanvas = useCallback(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef?.current || canvas.parentElement;

    if (!container) return;

    const rect = container.getBoundingClientRect();

    // Set canvas dimensions to match container
    canvas.width = rect.width;
    canvas.height = rect.height;
  }, [canvasRef, containerRef]);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Initial resize
    resizeCanvas();

    // Set up resize observer to handle container size changes
    const resizeObserver = new ResizeObserver(resizeCanvas);

    const container = containerRef?.current || canvasRef.current.parentElement;

    if (container) {
      resizeObserver.observe(container);
    }
    // Cleanup
    return () => {
      resizeObserver.disconnect();
    };
  }, [resizeCanvas]);

  return { resizeCanvas };
};
