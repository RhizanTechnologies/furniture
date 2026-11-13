import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Armchair,
  Activity,
  Store,
  Building2,
  MapPin,
  LogOut,
  User,
  ShoppingBag,
  Users,
  Layers,
  Boxes,
  DollarSign,
  BarChart3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';
import { useLanguage } from '@/context/LanguageContext';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { UserRole } from '@furniture/shared';

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isOwner, logout } = useAuth();
  const { isOnline } = useSync();
  const { t } = useLanguage();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const canAccessStock = isOwner || user?.branch?.stockMode === 'BRANCH_STOCK';

  const navLinks = [
    { to: '/', label: t('nav.dashboard', 'Dashboard'), icon: Activity, show: true },
    { to: '/orders', label: t('nav.orders', 'Orders'), icon: ShoppingBag, show: true },
    { to: '/customers', label: t('nav.customers', 'Customers'), icon: Users, show: true },
    { to: '/inventory', label: t('nav.inventory', 'Inventory'), icon: Boxes, show: canAccessStock },
    { to: '/finance', label: t('nav.finance', 'Finance'), icon: DollarSign, show: isOwner },
    { to: '/analytics', label: t('nav.analytics', 'Analytics'), icon: BarChart3, show: isOwner },
    { to: '/order-stages', label: t('nav.stages', 'Stages'), icon: Layers, show: isOwner },
    { to: '/showroom', label: t('nav.showroom', 'Showroom'), icon: Store, show: true },
    { to: '/catalog', label: t('nav.catalog', 'Catalog'), icon: Armchair, show: isOwner },
    { to: '/branches', label: t('nav.branches', 'Branches'), icon: Building2, show: isOwner },
    { to: '/my-branch', label: t('nav.myBranch', 'My Branch'), icon: MapPin, show: !isOwner && isAuthenticated },
    { to: '/system-health', label: t('nav.health', 'Health'), icon: Building2, show: isOwner },
  ].filter((l) => l.show);

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2 font-bold tracking-tight text-wood-900">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-wood-700 text-wood-50">
            <Armchair className="h-4 w-4" />
          </div>
          <span className="hidden sm:inline-block text-base font-semibold">Furniture ERP</span>
          <Badge variant="wood" className="ml-1 text-[10px] uppercase tracking-wider">
            {isOwner ? t('nav.ownerConsole', 'Owner Console') : t('nav.branchConsole', 'Branch Console')}
          </Badge>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
          {navLinks.map((link) => {
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

        {/* User profile, Language Switcher & Online status */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* Online status indicator: Minimal green dot */}
          <div
            className="flex items-center justify-center p-1.5"
            title={isOnline ? t('common.online', 'Online') : t('common.offline', 'Offline')}
            aria-label={isOnline ? 'Online' : 'Offline'}
          >
            <span className="relative flex h-2.5 w-2.5">
              {isOnline && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              )}
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isOnline
                    ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]'
                    : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.8)]'
                }`}
              />
            </span>
          </div>

          {isAuthenticated && user ? (
            <div className="flex items-center space-x-2">
              <div className="hidden lg:flex flex-col text-right">
                <span className="text-xs font-semibold text-charcoal-900 leading-none">{user.fullName}</span>
                <span className="text-[10px] text-muted-foreground">{user.role}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLogout}
                title={t('nav.logout', 'Log Out')}
                className="h-8 w-8 text-charcoal-600 hover:text-red-700 hover:bg-red-50"
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
