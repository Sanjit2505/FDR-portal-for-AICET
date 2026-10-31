import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'default' | 'danger' | 'warning' | 'success' | 'indigo';
  onClick?: () => void;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  onClick,
}) => {
  const accentBorders = {
    default: 'hover:border-white/[0.18] border-white/[0.08]',
    danger: 'border-rose-500/30 hover:border-rose-500/50 bg-rose-950/[0.08]',
    warning: 'border-amber-500/30 hover:border-amber-500/50 bg-amber-950/[0.08]',
    success: 'border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-950/[0.08]',
    indigo: 'border-indigo-500/30 hover:border-indigo-500/50 bg-indigo-950/[0.08]',
  }[variant];

  const iconStyles = {
    default: 'text-slate-400 bg-white/[0.04] border-white/[0.08]',
    danger: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
    warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    success: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  }[variant];

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15, ease: 'easeOut' }}
      onClick={onClick}
      className={`p-5 rounded-2xl bg-[#0c1222]/80 backdrop-blur-md border ${accentBorders} transition-all shadow-[0_4px_20px_rgba(0,0,0,0.25)] relative overflow-hidden group ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-mono uppercase font-semibold text-slate-400 tracking-wider">
          {title}
        </span>
        <div className={`p-2 rounded-xl border ${iconStyles} transition-transform group-hover:scale-105`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>

      <div className="mt-3">
        <span className="text-2xl lg:text-[28px] font-bold tracking-tight text-white font-mono tabular-nums">
          {value}
        </span>
      </div>

      {subtitle && (
        <div className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-slate-400 font-sans">
          <span>{subtitle}</span>
        </div>
      )}
    </motion.div>
  );
};
