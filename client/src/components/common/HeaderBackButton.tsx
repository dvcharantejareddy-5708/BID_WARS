import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface HeaderBackButtonProps {
  label?: string;
  onClick: () => void;
  className?: string;
}

export const HeaderBackButton: React.FC<HeaderBackButtonProps> = ({
  label = 'Back',
  onClick,
  className = ''
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 py-2 px-3 rounded-xl bg-[#12142A] border border-[#2A2F60] text-gray-300 hover:text-white hover:border-[#C8FF3D] hover:bg-[#181B38] font-heading font-black text-xs uppercase tracking-wider transition-all shadow-sm ${className}`}
      title={label}
      aria-label={label}
    >
      <ArrowLeft className="w-4 h-4 text-[#C8FF3D]" />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};
