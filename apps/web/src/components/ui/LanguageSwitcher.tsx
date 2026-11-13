import React from 'react';
import { Globe, Check } from 'lucide-react';
import { useLanguage } from '@/context/LanguageContext';
import { Language, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

interface LanguageSwitcherProps {
  variant?: 'compact' | 'pills' | 'select';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'compact',
  className,
}) => {
  const { language, setLanguage } = useLanguage();
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  React.useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const currentOption = SUPPORTED_LANGUAGES.find((l) => l.code === language) || SUPPORTED_LANGUAGES[0];

  if (variant === 'pills') {
    return (
      <div className={cn('grid grid-cols-3 gap-1.5 p-1 bg-wood-100/80 rounded-xl border border-wood-200/80 w-full', className)}>
        {SUPPORTED_LANGUAGES.map((opt) => {
          const isSelected = opt.code === language;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              className={cn(
                'px-2 py-1.5 text-xs font-semibold rounded-lg transition-all flex items-center justify-center gap-1.5 truncate',
                isSelected
                  ? 'bg-wood-800 text-white shadow-xs'
                  : 'text-charcoal-700 hover:text-wood-950 hover:bg-white/60'
              )}
            >
              <span className="shrink-0">{opt.flag}</span>
              <span className="truncate">{opt.nativeLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact dropdown variant (ideal for TopNav & headers)
  return (
    <div className={cn('relative inline-block text-left shrink-0', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-20 px-2 py-1.5 rounded-lg text-xs font-medium border border-wood-200 bg-white hover:bg-wood-50 text-wood-950 transition-colors shadow-2xs shrink-0 select-none"
        title="Switch Language / ቋንቋ ቀይር / Afaan Jijjiiri"
      >
        <span className="flex items-center space-x-1.5 shrink-0">
          <span className="text-sm leading-none shrink-0">{currentOption.flag}</span>
          <span className="font-bold text-xs uppercase tracking-wide">
            {currentOption.code === 'am' ? 'አማ' : currentOption.code.toUpperCase()}
          </span>
        </span>
        <span className="text-[9px] text-muted-foreground shrink-0 ml-1">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white border border-wood-200/90 shadow-2xl py-1.5 z-50 animate-in fade-in-0 zoom-in-95">
          <div className="px-3 py-1 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-wood-100">
            Select Language / ቋንቋ
          </div>
          {SUPPORTED_LANGUAGES.map((opt) => {
            const isSelected = opt.code === language;
            return (
              <button
                key={opt.code}
                type="button"
                onClick={() => {
                  setLanguage(opt.code);
                  setIsOpen(false);
                }}
                className={cn(
                  'w-full px-3 py-2 text-left text-xs flex items-center justify-between transition-colors',
                  isSelected
                    ? 'bg-wood-50 text-wood-950 font-bold'
                    : 'text-charcoal-700 hover:bg-wood-50/60 hover:text-wood-950'
                )}
              >
                <div className="flex items-center space-x-2">
                  <span className="text-base">{opt.flag}</span>
                  <div>
                    <div className="leading-tight">{opt.nativeLabel}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{opt.label}</div>
                  </div>
                </div>
                {isSelected && <Check className="h-3.5 w-3.5 text-wood-800" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
