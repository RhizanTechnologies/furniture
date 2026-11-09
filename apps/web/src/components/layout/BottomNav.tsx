import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Activity, Store, Building2 } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();

  const links = [
    { to: '/', label: 'Dashboard', icon: Activity },
    { to: '/showroom', label: 'Showroom', icon: Store },
    { to: '/system-health', label: 'Health', icon: Building2 },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 z-40 w-full border-t border-wood-200 bg-background/95 backdrop-blur safe-area-bottom">
      <div className="grid grid-cols-3 h-16">
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`flex flex-col items-center justify-center space-y-1 text-xs transition-colors ${
                isActive
                  ? 'text-wood-800 font-bold'
                  : 'text-charcoal-500 hover:text-wood-700'
              }`}
            >
              <Icon className={`h-5 w-5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
