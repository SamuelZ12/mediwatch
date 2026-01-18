'use client';

import React from 'react';

interface RiskBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

function getRiskLevel(score: number): {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
} {
  if (score >= 81) {
    return {
      label: 'High',
      bgColor: 'bg-red-100',
      textColor: 'text-red-700',
      borderColor: 'border-red-200',
    };
  }
  if (score >= 61) {
    return {
      label: 'Elevated',
      bgColor: 'bg-orange-100',
      textColor: 'text-orange-700',
      borderColor: 'border-orange-200',
    };
  }
  if (score >= 31) {
    return {
      label: 'Moderate',
      bgColor: 'bg-amber-100',
      textColor: 'text-amber-700',
      borderColor: 'border-amber-200',
    };
  }
  return {
    label: 'Low',
    bgColor: 'bg-emerald-100',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
  };
}

const RiskBadge: React.FC<RiskBadgeProps> = ({
  score,
  size = 'md',
  showLabel = false,
  className = '',
}) => {
  const { label, bgColor, textColor, borderColor } = getRiskLevel(score);

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };

  return (
    <span
      className={`inline-flex items-center gap-1 font-bold rounded-full border ${bgColor} ${textColor} ${borderColor} ${sizeClasses[size]} ${className}`}
    >
      <span>{score}</span>
      {showLabel && <span className="text-[0.7em] uppercase opacity-80">{label}</span>}
    </span>
  );
};

export default RiskBadge;
