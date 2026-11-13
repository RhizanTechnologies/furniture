import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Armchair,
  Activity,
  Store,
  Building2,
  MapPin,
  LogOut,
  ShoppingBag,
  Users,
  Layers,
  Boxes,
  DollarSign,
  BarChart3,
  ChevronDown,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isOwner, logout } = useAuth();
  const { isOnline } = useSync();
  const { t } = useLanguage();

  const [isOperationsOpen, setIsOperationsOpen] = useState(false);
  const operationsRef = useRef<HTMLDivElement>(null);

  // Close operations dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (operationsRef.current && !operationsRef.current.contains(e.target as Node)) {
        setIsOperationsOpen(false);
      }
    };
    if (isOperationsOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOperationsOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const canAccessStock = isOwner || user?.branch?.stockMode === 'BRANCH_STOCK';

  // Primary navigation links visible in main navbar row
  const primaryLinks = [
    { to: '/', label: t('nav.dashboard', 'Dashboard'), icon: Activity },
    { to: '/orders', label: t('nav.orders', 'Orders'), icon: ShoppingBag },
    { to: '/showroom', label: t('nav.showroom', 'Showroom'), icon: Store },
    { to: '/customers', label: t('nav.customers', 'Customers'), icon: Users },
    ...(canAccessStock ? [{ to: '/inventory', label: t('nav.inventory', 'Inventory'), icon: Boxes }] : []),
  ];

  // Secondary/administrative modules grouped inside the Operations dropdown
  const operationsLinks = [
    ...(isOwner
      ? [
          {
            to: '/finance',
            label: t('nav.finance', 'Finance & P&L'),
            description: t('finance.subtitle', 'Ledger, operating expenses & revenue'),
            icon: DollarSign,
          },
          {
            to: '/analytics',
            label: t('nav.analytics', 'Analytics & BI'),
            description: t('analytics.subtitle', 'Performance metrics & growth trends'),
            icon: BarChart3,
          },
          {
            to: '/catalog',
            label: t('nav.catalog', 'Catalog Models'),
            description: t('catalog.subtitle', 'Dimensions, specifications & pricing'),
            icon: Armchair,
          },
          {
            to: '/order-stages',
            label: t('nav.stages', 'Order Stages'),
            description: t('stages.subtitle', 'Manufacturing pipeline workflow'),
            icon: Layers,
          },
          {
            to: '/branches',
            label: t('nav.branches', 'Branches'),
            description: t('branches.subtitle', 'Workshops, showrooms & stock modes'),
            icon: Building2,
          },
          {
            to: '/system-health',
            label: t('nav.health', 'System Health'),
            description: 'Connectivity, diagnostics & sync',
            icon: ShieldCheck,
          },
        ]
      : [
          {
            to: '/my-branch',
            label: t('nav.myBranch', 'My Branch'),
            description: t('myBranch.subtitle', 'Branch staff & assigned inventory'),
            icon: MapPin,
          },
        ]),
  ];

  const isOperationsActive = operationsLinks.some((l) => location.pathname === l.to);

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-wood-200/80 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-[0_1px_3px_rgba(44,30,15,0.03)] transition-colors">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between gap-4">
        {/* Left: Brand Identity */}
        <Link to="/" className="flex items-center space-x-2.5 font-bold tracking-tight text-wood-950 group shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-wood-800 via-wood-900 to-wood-950 text-wood-50 shadow-xs ring-1 ring-wood-700/50 group-hover:scale-105 transition-transform duration-200">
            <Armchair className="h-5 w-5 text-amber-200 stroke-[1.8]" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center space-x-1.5">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-wood-950 leading-tight">
                Noorcent
              </span>
              <span className="hidden sm:inline-block text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-wood-100 text-wood-900 border border-wood-200/80">
                ERP
              </span>
            </div>
            <span className="text-[10px] font-medium text-stone-500 uppercase tracking-widest hidden lg:block -mt-0.5">
              Furniture Studio
            </span>
          </div>
        </Link>

        {/* Center: Desktop Navigation Bar */}
        <nav className="hidden md:flex items-center space-x-1 lg:space-x-1.5 text-xs font-medium">
          {primaryLinks.map((link) => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isActive
                    ? 'bg-wood-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-wood-100/70'
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? 'text-amber-200' : 'text-stone-500'}`} />
                <span>{link.label}</span>
              </Link>
            );
          })}

          {/* Operations Dropdown */}
          {operationsLinks.length > 0 && (
            <div className="relative" ref={operationsRef}>
              <button
                type="button"
                onClick={() => setIsOperationsOpen(!isOperationsOpen)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 ${
                  isOperationsActive
                    ? 'bg-wood-800 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-950 hover:bg-wood-100/70'
                }`}
              >
                <Layers className={`h-3.5 w-3.5 ${isOperationsActive ? 'text-amber-200' : 'text-stone-500'}`} />
                <span>{t('common.centralOperations', 'Operations')}</span>
                <ChevronDown
                  className={`h-3 w-3 ml-0.5 transition-transform duration-200 ${
                    isOperationsOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isOperationsOpen && (
                <div className="absolute left-0 mt-2 w-72 rounded-2xl bg-white border border-wood-200/90 shadow-xl p-2 z-50 animate-in fade-in-0 zoom-in-95">
                  <div className="px-3 py-1.5 text-[10px] uppercase font-bold tracking-wider text-muted-foreground border-b border-wood-100 mb-1">
                    {t('common.centralOperations', 'Operations & Management')}
                  </div>
                  <div className="space-y-0.5">
                    {operationsLinks.map((item) => {
                      const Icon = item.icon;
                      const isItemActive = location.pathname === item.to;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setIsOperationsOpen(false)}
                          className={`flex items-start space-x-2.5 p-2 rounded-xl text-xs transition-colors ${
                            isItemActive
                              ? 'bg-wood-100/90 text-wood-950 font-bold'
                              : 'hover:bg-wood-50 text-stone-700 hover:text-stone-950'
                          }`}
                        >
                          <div
                            className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                              isItemActive ? 'bg-wood-800 text-white' : 'bg-wood-100 text-wood-800'
                            }`}
                          >
                            <Icon className="h-3.5 w-3.5" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-stone-900 leading-tight">{item.label}</div>
                            <div className="text-[10px] text-stone-500 line-clamp-1 mt-0.5 leading-snug">
                              {item.description}
                            </div>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Right: Language Switcher, Online Indicator, User Profile */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Connection Status: Minimal Green Dot Pill */}
          <div
            className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full border border-wood-200/90 bg-wood-50/70 text-[11px] font-medium text-stone-700 shadow-2xs"
            title={isOnline ? t('common.online', 'Online') : t('common.offline', 'Offline')}
          >
            <span className="relative flex h-2 w-2">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isOnline
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                }`}
              />
            </span>
            <span className="hidden sm:inline font-semibold text-[10.5px]">
              {isOnline ? t('common.online', 'Online') : t('common.offline', 'Offline')}
            </span>
          </div>

          {/* User Profile / Logout */}
          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2 pl-1 border-l border-wood-200/80">
              <div
                className="h-8 w-8 rounded-full bg-wood-800 text-white flex items-center justify-center font-bold text-xs shadow-xs ring-2 ring-wood-200"
                title={`${user.fullName} (${user.role})`}
              >
                {getInitials(user.fullName)}
              </div>
              <div className="hidden lg:flex flex-col text-left">
                <span className="text-xs font-bold text-stone-900 leading-none truncate max-w-[120px]">
                  {user.fullName}
                </span>
                <span className="text-[10px] text-wood-700 font-medium capitalize leading-tight mt-0.5">
                  {user.role?.toLowerCase() || 'staff'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title={t('nav.logout', 'Log Out')}
                className="h-8 w-8 text-stone-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" variant="outline" className="text-xs h-8">
                {t('nav.login', 'Sign In')}
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
export default TopNav;
