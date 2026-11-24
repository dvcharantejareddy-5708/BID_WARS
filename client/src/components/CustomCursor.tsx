import React, { useEffect, useState, useRef } from 'react';

export const CustomCursor: React.FC = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [targetPosition, setTargetPosition] = useState({ x: -100, y: -100 });
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isRecMode, setIsRecMode] = useState(false);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    // Check if touch device
    if (typeof window !== 'undefined') {
      const isTouch = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
      setIsTouchDevice(isTouch);
      if (isTouch) return;

      const params = new URLSearchParams(window.location.search);
      setIsRecMode(params.has('rec'));

      const handleMouseMove = (e: MouseEvent) => {
        setTargetPosition({ x: e.clientX, y: e.clientY });
        if (!isVisible) setIsVisible(true);

        const target = e.target as HTMLElement | null;
        if (target) {
          const isInteractive = Boolean(
            target.closest('button, a, input, select, textarea, [role="button"], .interactive, .cursor-pointer')
          );
          setIsHovered(isInteractive);
        }
      };

      const handleMouseDown = () => setIsPressed(true);
      const handleMouseUp = () => setIsPressed(false);
      const handleMouseLeave = () => setIsVisible(false);
      const handleMouseEnter = () => setIsVisible(true);

      window.addEventListener('mousemove', handleMouseMove, { passive: true });
      window.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mouseup', handleMouseUp);
      document.body.addEventListener('mouseleave', handleMouseLeave);
      document.body.addEventListener('mouseenter', handleMouseEnter);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.removeEventListener('mouseleave', handleMouseLeave);
        document.body.removeEventListener('mouseenter', handleMouseEnter);
      };
    }
  }, [isVisible]);

  // Smooth lerp trailing
  useEffect(() => {
    if (isTouchDevice) return;

    const render = () => {
      setPosition(prev => {
        const dx = targetPosition.x - prev.x;
        const dy = targetPosition.y - prev.y;
        return {
          x: prev.x + dx * 0.35,
          y: prev.y + dy * 0.35
        };
      });
      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [targetPosition, isTouchDevice]);

  if (isTouchDevice || !isVisible) return null;

  const baseSize = isRecMode ? (isHovered ? 48 : 30) : (isHovered ? 38 : 22);
  const size = isPressed ? baseSize * 0.8 : baseSize;

  return (
    <div
      className="pointer-events-none fixed top-0 left-0 z-[9999] will-change-transform transition-all duration-150 ease-out flex items-center justify-center"
      style={{
        transform: `translate3d(${position.x}px, ${position.y}px, 0) translate(-50%, -50%)`,
        width: `${size}px`,
        height: `${size}px`
      }}
    >
      <div
        className={`w-full h-full rounded-full border transition-all duration-200 ${
          isHovered
            ? 'border-[#E9C77D] bg-[rgba(214,173,85,0.18)] shadow-[0_0_16px_rgba(214,173,85,0.4)]'
            : isPressed
            ? 'border-[#D6AD55] bg-[rgba(214,173,85,0.4)]'
            : 'border-[rgba(214,173,85,0.7)] bg-[rgba(214,173,85,0.08)]'
        }`}
      />
      {/* Inner dot */}
      <div
        className={`absolute rounded-full bg-[#E9C77D] transition-transform duration-150 ${
          isHovered ? 'scale-0' : 'w-1 h-1 scale-100'
        }`}
      />
    </div>
  );
};
