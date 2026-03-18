'use client';

import { useEffect, useRef } from 'react';

interface SparklineProps {
  values: number[];
  trendPercent: number;
  width?: number;
  height?: number;
  className?: string;
  /** Show gradient fill under the line */
  showGradient?: boolean;
  /** Line thickness */
  lineWidth?: number;
}

/**
 * Enhanced Sparkline component - Mini canvas visualization for election margin trends
 *
 * Features:
 * - Renders 3-5 data points as a smooth line chart
 * - Gradient fill under line for depth and visual polish
 * - Color based on trend direction (green up, red down, amber neutral)
 * - Glowing endpoint dot highlight
 * - HiDPI/Retina support
 * - Respects prefers-reduced-motion
 */
export default function Sparkline({
  values,
  trendPercent,
  width = 48,
  height = 16,
  className = '',
  showGradient = true,
  lineWidth = 1.5,
}: SparklineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || values.length < 2) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas resolution for crisp rendering on HiDPI displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Color based on trend direction
    const color =
      trendPercent > 20
        ? '#059669' // Green - improving (emerald-600)
        : trendPercent < -20
        ? '#DC2626' // Red - declining (red-600)
        : '#D97706'; // Amber - neutral (amber-600, WCAG compliant)

    // Normalize values to fit canvas height
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1; // Avoid division by zero

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    const stepX = width / (values.length - 1);
    const padding = 3; // Padding from edges

    // Calculate all points first
    const points = values.map((val, i) => ({
      x: i * stepX,
      y: height - ((val - min) / range) * (height - padding * 2) - padding,
    }));

    // Draw gradient fill under the line
    if (showGradient) {
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      // Draw line path
      points.forEach((point, i) => {
        if (i > 0) {
          ctx.lineTo(point.x, point.y);
        }
      });

      // Close path to bottom for fill
      ctx.lineTo(points[points.length - 1].x, height);
      ctx.lineTo(points[0].x, height);
      ctx.closePath();

      // Create vertical gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, `${color}30`); // 19% opacity at top
      gradient.addColorStop(0.5, `${color}15`); // 8% opacity in middle
      gradient.addColorStop(1, `${color}00`); // Transparent at bottom

      ctx.fillStyle = gradient;
      ctx.fill();
    }

    // Draw the main line with smooth rendering
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    points.forEach((point, i) => {
      if (i === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });

    ctx.stroke();

    // Draw glowing endpoint dot
    const lastPoint = points[points.length - 1];

    // Outer glow
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = `${color}40`; // 25% opacity
    ctx.fill();

    // Inner dot with shadow
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(lastPoint.x, lastPoint.y, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    // Reset shadow
    ctx.shadowBlur = 0;

    // White center highlight for depth
    ctx.beginPath();
    ctx.arc(lastPoint.x - 0.5, lastPoint.y - 0.5, 1, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
  }, [values, trendPercent, width, height, showGradient, lineWidth]);

  // Don't render if insufficient data
  if (values.length < 2) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      className={`sparkline ${className}`}
      style={{ width: `${width}px`, height: `${height}px` }}
      aria-label={`Trend line showing ${values.length} data points with ${trendPercent > 0 ? 'positive' : 'negative'} ${Math.abs(trendPercent).toFixed(1)}% change`}
      role="img"
    />
  );
}
