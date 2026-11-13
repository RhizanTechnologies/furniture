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
      <div className={cn('flex items-center gap-1.5 p-1 bg-wood-100/80 rounded-xl border border-wood-200/80', className)}>
        {SUPPORTED_LANGUAGES.map((opt) => {
          const isSelected = opt.code === language;
          return (
            <button
              key={opt.code}
              type="button"
              onClick={() => setLanguage(opt.code)}
              className={cn(
                'px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5',
                isSelected
                  ? 'bg-wood-800 text-white shadow-xs'
                  : 'text-charcoal-700 hover:text-wood-950 hover:bg-white/60'
              )}
            >
              <span>{opt.flag}</span>
              <span>{opt.nativeLabel}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // Compact dropdown variant (ideal for TopNav & headers)
  return (
    <div className={cn('relative inline-block text-left', className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border border-wood-200 bg-white hover:bg-wood-50 text-wood-950 transition-colors shadow-2xs"
        title="Switch Language / ቋንቋ ቀይር / Afaan Jijjiiri"
      >
        <Globe className="h-3.5 w-3.5 text-wood-700" />
        <span className="font-semibold">{currentOption.nativeLabel}</span>
        <span className="text-[10px] text-muted-foreground ml-0.5">▼</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-1.5 w-44 rounded-xl bg-white border border-wood-200 shadow-lg py-1.5 z-50 animate-in fade-in-0 zoom-in-95">
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
