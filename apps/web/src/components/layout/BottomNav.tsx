import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Activity,
  ShoppingBag,
  Users,
  Boxes,
  MoreHorizontal,
  DollarSign,
  Store,
  Armchair,
  Layers,
  BarChart3,
  Building2,
  MapPin,
  LogOut,
  X,
  ChevronRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { useSync } from '@/context/SyncContext';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isOwner, isAuthenticated, logout } = useAuth();
  const { isOnline } = useSync();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const canAccessStock = isOwner || user?.branch?.stockMode === 'BRANCH_STOCK';

  // Role-customized primary tabs (5 core items + 1 More hub on a single 6-column row)
  const primaryTabs = isOwner
    ? [
        { to: '/', label: 'Home', icon: Activity },
        { to: '/orders', label: 'Orders', icon: ShoppingBag },
        { to: '/inventory', label: 'Stock', icon: Boxes },
        { to: '/branches', label: 'Branches', icon: Building2 },
        { to: '/finance', label: 'Finance', icon: DollarSign },
      ]
    : [
        { to: '/', label: 'Home', icon: Activity },
        { to: '/orders', label: 'Orders', icon: ShoppingBag },
        { to: '/customers', label: 'Customers', icon: Users },
        { to: '/inventory', label: 'Stock', icon: Boxes },
        { to: '/my-branch', label: 'Branch', icon: MapPin },
      ];

  // Secondary modules accessible via the "More Hub"
  const secondaryModules = [
    {
      to: '/customers',
      label: 'Client Registry',
      description: 'Customer contact records & purchase history',
      icon: Users,
      color: 'bg-blue-50 text-blue-800 border-blue-200',
      show: isOwner, // Shown in More for owner because Orders/Stock/Branches/Finance are on the main bar
    },
    {
      to: '/showroom',
      label: 'Digital Showroom',
      description: 'High-res gallery for client consultations',
      icon: Store,
      color: 'bg-wood-50 text-wood-800 border-wood-200',
      show: true,
    },
    {
      to: '/catalog',
      label: 'Product Catalog',
      description: 'Furniture models, dimensions & base prices',
      icon: Armchair,
      color: 'bg-amber-50 text-amber-900 border-amber-200',
      show: isOwner,
    },
    {
      to: '/order-stages',
      label: 'Custom Stages',
      description: 'Manufacturing pipeline steps & progression',
      icon: Layers,
      color: 'bg-indigo-50 text-indigo-800 border-indigo-200',
      show: isOwner,
    },
    {
      to: '/analytics',
      label: 'Business Analytics',
      description: 'Revenue graphs, margins & branch performance',
      icon: BarChart3,
      color: 'bg-sky-50 text-sky-800 border-sky-200',
      show: isOwner,
    },
    {
      to: '/system-health',
      label: 'System & Sync Health',
      description: 'Offline database, cloud sync & healthcheck',
      icon: ShieldCheck,
      color: 'bg-purple-50 text-purple-800 border-purple-200',
      show: isOwner,
    },
  ].filter((m) => m.show);

  // Check if current route is one of the secondary modules
  const isSecondaryActive = secondaryModules.some((m) => location.pathname === m.to);

  const handleNavigate = (path: string) => {
    setIsMoreOpen(false);
    navigate(path);
  };

  const handleLogout = async () => {
    setIsMoreOpen(false);
    await logout();
    navigate('/login');
  };

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
    <>
      {/* Floating Modern Pill Dock */}
      <nav
        aria-label="Mobile Navigation Dock"
        className="md:hidden fixed bottom-3 inset-x-3 z-40 max-w-md mx-auto pointer-events-auto"
        style={{
          bottom: 'max(0.75rem, env(safe-area-inset-bottom, 0.75rem))',
        }}
      >
        <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-xl border border-wood-200/90 dark:border-stone-800 shadow-[0_8px_32px_rgba(44,30,15,0.14)] rounded-2xl px-1 py-1 grid grid-cols-6 items-center gap-0.5">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = location.pathname === tab.to;

            return (
              <Link
                key={tab.to}
                to={tab.to}
                className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl text-center transition-all duration-200 ${
                  isActive
                    ? 'bg-wood-100/90 text-wood-950 font-bold scale-[1.02] shadow-xs'
                    : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50 active:scale-95'
                }`}
              >
                <Icon
                  className={`h-4.5 w-4.5 transition-transform duration-200 ${
                    isActive ? 'stroke-[2.4px] text-wood-900 scale-105' : 'stroke-2'
                  }`}
                />
                <span className="text-[9.5px] tracking-tight leading-none mt-1 select-none truncate max-w-full">
                  {tab.label}
                </span>
              </Link>
            );
          })}

          {/* More Action Trigger Button */}
          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            aria-label="Open More Menu Hub"
            className={`relative flex flex-col items-center justify-center py-1 px-1 rounded-xl text-center transition-all duration-200 ${
              isMoreOpen || isSecondaryActive
                ? 'bg-wood-100/90 text-wood-950 font-bold scale-[1.02] shadow-xs'
                : 'text-stone-500 hover:text-stone-900 hover:bg-stone-50 active:scale-95'
            }`}
          >
            <MoreHorizontal
              className={`h-4.5 w-4.5 transition-transform duration-200 ${
                isMoreOpen || isSecondaryActive ? 'stroke-[2.4px] text-wood-900 scale-105' : 'stroke-2'
              }`}
            />
            <span className="text-[9.5px] tracking-tight leading-none mt-1 select-none">
              More
            </span>
          </button>
        </div>
      </nav>

      {/* Fancy "More Hub" Slide-Up Sheet Modal */}
      <Dialog open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[88vh] overflow-y-auto p-4 sm:p-5 rounded-3xl border-wood-200/90 shadow-2xl bg-white">
          {/* Subtle Top Handle Pill */}
          <div className="w-12 h-1 bg-stone-200 rounded-full mx-auto mb-2" />

          <DialogHeader className="text-left pb-2 border-b border-wood-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-wood-800 to-wood-600 text-wood-50 flex items-center justify-center font-bold text-sm shadow-xs">
                  {getInitials(user?.fullName)}
                </div>
                <div>
                  <DialogTitle className="text-sm font-bold text-stone-900 leading-snug">
                    {user?.fullName || 'Business Console'}
                  </DialogTitle>
                  <DialogDescription className="text-[11px] text-stone-500 flex items-center gap-1.5">
                    <span>{user?.branch?.name || (isOwner ? 'Central Operations' : 'Branch Staff')}</span>
                    <span>•</span>
                    <Badge variant="wood" className="text-[9px] px-1.5 py-0">
                      {isOwner ? 'Owner' : user?.role || 'Staff'}
                    </Badge>
                  </DialogDescription>
                </div>
              </div>

              {/* Online/Offline status pill */}
              <div
                className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  isOnline
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-amber-50 text-amber-800 border-amber-200'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span>{isOnline ? 'Cloud Synced' : 'Offline'}</span>
              </div>
            </div>
          </DialogHeader>

          {/* Module Navigation Grid */}
          <div className="space-y-1.5 pt-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400 px-1">
              Enterprise Tools & Extensions
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {secondaryModules.map((mod) => {
                const Icon = mod.icon;
                const isActive = location.pathname === mod.to;

                return (
                  <button
                    key={mod.to}
                    type="button"
                    onClick={() => handleNavigate(mod.to)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-start space-x-3 ${
                      isActive
                        ? 'border-wood-700 bg-wood-50/70 shadow-xs'
                        : 'border-wood-100 bg-stone-50/50 hover:bg-stone-50 hover:border-wood-300 active:scale-[0.98]'
                    }`}
                  >
                    <div className={`p-2 rounded-xl border shrink-0 ${mod.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-stone-900 truncate">
                          {mod.label}
                        </span>
                        {isActive && (
                          <Badge variant="wood" className="text-[9px] px-1 py-0 ml-1">
                            Active
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-stone-500 line-clamp-1 mt-0.5">
                        {mod.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-wood-100 flex items-center justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="text-xs text-rose-700 border-rose-200 hover:bg-rose-50 hover:border-rose-300 space-x-1.5 flex-1"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Log Out</span>
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsMoreOpen(false)}
              className="text-xs text-stone-600 hover:bg-stone-100"
            >
              Dismiss
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
