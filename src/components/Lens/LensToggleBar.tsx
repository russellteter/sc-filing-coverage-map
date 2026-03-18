'use client';

import type { LensId } from '@/types/lens';

interface LensToggleBarProps {
  activeLens: LensId;
  onLensChange: (lens: LensId) => void;
  className?: string;
  compact?: boolean;
}

export default function LensToggleBar(_props: LensToggleBarProps) {
  return null;
}
