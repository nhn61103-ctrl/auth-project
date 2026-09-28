import React from 'react';

type BrandMarkProps = {
  mode?: 'default' | 'compact';
  suffix?: string;
  className?: string;
};

const BrandMark: React.FC<BrandMarkProps> = ({ mode = 'default', suffix, className = '' }) => {
  const compact = mode === 'compact';
  const outerRadius = compact ? 'rounded-xl' : 'rounded-2xl';
  const innerRadius = compact ? 'rounded-[11px]' : 'rounded-[15px]';

  return (
    <div className={`flex items-center gap-3 ${className}`.trim()}>
      <div className={`relative overflow-hidden ${outerRadius} border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] shadow-[0_14px_40px_rgba(0,0,0,0.22)]`}>
        <div className={`absolute inset-[1px] ${innerRadius} bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),rgba(255,255,255,0.03)_45%,rgba(7,12,24,0.98)_100%)]`} />
        <div className={`relative flex items-center ${compact ? 'h-9 px-2.5' : 'h-11 px-3.5'} gap-2`}>
          <div className={`flex flex-col justify-center gap-1 ${compact ? 'mr-0.5' : 'mr-1'}`}>
            <span className={`${compact ? 'h-1.5 w-1.5' : 'h-2 w-2'} rounded-full bg-white`} />
            <span className={`${compact ? 'h-1 w-4' : 'h-1.5 w-5'} rounded-full bg-white/85`} />
            <span className={`${compact ? 'h-1 w-3' : 'h-1.5 w-4'} rounded-full bg-sky-400/90`} />
          </div>
          <span className={`${compact ? 'text-[0.78rem]' : 'text-[0.92rem]'} font-black tracking-[0.24em] text-white`}>TXA</span>
        </div>
      </div>
      <div className="flex flex-col leading-none">
        <span className={`${compact ? 'text-base' : 'text-lg'} font-semibold tracking-tight text-white`}>TenzoX</span>
        <span className={`${compact ? 'text-[0.58rem]' : 'text-[0.62rem]'} uppercase tracking-[0.34em] text-white/45`}>
          {suffix || 'Auth Control'}
        </span>
      </div>
    </div>
  );
};

export default BrandMark;
