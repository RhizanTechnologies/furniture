import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Armchair, Activity, Store, Building2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const TopNav: React.FC = () => {
  const location = useLocation();

  const links = [
    { to: '/', label: 'Dashboard', icon: Activity },
    { to: '/showroom', label: 'Showroom', icon: Store },
    { to: '/system-health', label: 'System Health', icon: Building2 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 font-bold tracking-tight text-wood-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-wood-700 text-wood-50">
            <Armchair className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline-block text-base font-semibold">Furniture ERP</span>
          <Badge variant="wood" className="ml-1 text-[10px] uppercase tracking-wider">
            Mobile PWA
          </Badge>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center space-x-1.5 transition-colors hover:text-wood-700 ${
                  isActive ? 'text-wood-800 font-semibold border-b-2 border-wood-700 pb-0.5' : 'text-charcoal-600'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Online / Status indicator */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      </div>
    </header>
  );
};
