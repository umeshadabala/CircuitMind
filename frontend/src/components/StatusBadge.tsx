import React from 'react';
import { Severity } from '../types';

interface StatusBadgeProps {
  severity?: Severity | 'CLEAN';
  label?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ severity = 'INFO', label, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-3 py-1 text-xs';

  let colorClasses = 'bg-[#18181F] text-[#A1A1AA] border-[#2A2A35]';

  if (severity === 'ERROR') {
    colorClasses = 'bg-rose-950/50 text-rose-300 border-rose-800/60';
  } else if (severity === 'WARNING') {
    colorClasses = 'bg-amber-950/50 text-amber-300 border-amber-800/60';
  } else if (severity === 'INFO') {
    colorClasses = 'bg-blue-950/50 text-blue-300 border-blue-800/60';
  } else if (severity === 'CLEAN') {
    colorClasses = 'bg-emerald-950/50 text-emerald-300 border-emerald-800/60';
  }

  return (
    <span className={`inline-flex items-center font-mono font-medium rounded border ${sizeClasses} ${colorClasses}`}>
      {label || severity}
    </span>
  );
};

