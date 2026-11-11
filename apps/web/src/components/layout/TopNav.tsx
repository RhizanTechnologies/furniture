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
import { UserRole } from '@furniture/shared';

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isOwner, logout } = useAuth();
  const { isOnline } = useSync();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const canAccessStock = isOwner || user?.branch?.stockMode === 'BRANCH_STOCK';

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: Activity, show: true },
    { to: '/orders', label: 'Orders', icon: ShoppingBag, show: true },
    { to: '/customers', label: 'Customers', icon: Users, show: true },
    { to: '/inventory', label: 'Inventory', icon: Boxes, show: canAccessStock },
    { to: '/finance', label: 'Finance', icon: DollarSign, show: isOwner },
    { to: '/analytics', label: 'Analytics', icon: BarChart3, show: isOwner },
    { to: '/order-stages', label: 'Stages', icon: Layers, show: isOwner },
    { to: '/showroom', label: 'Showroom', icon: Store, show: true },
    { to: '/catalog', label: 'Catalog', icon: Armchair, show: isOwner },
    { to: '/branches', label: 'Branches', icon: Building2, show: isOwner },
    { to: '/my-branch', label: 'My Branch', icon: MapPin, show: !isOwner && isAuthenticated },
    { to: '/system-health', label: 'Health', icon: Building2, show: isOwner },
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
            {isOwner ? 'Owner Console' : 'Branch Console'}
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

        {/* User profile & Online status: compact dot indicator */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          <div
            className={`flex items-center space-x-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border ${
              isOnline
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}
            title={isOnline ? 'Online (Connected to ERP Cloud)' : 'Offline Mode (Local Storage)'}
          >
            <span
              className={`h-2 w-2 rounded-full inline-block ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[10px] sm:text-xs font-semibold">{isOnline ? 'Online' : 'Offline'}</span>
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
                title="Log Out"
                className="h-8 w-8 text-charcoal-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Link to="/login">
              <Button size="sm" variant="outline" className="text-xs h-8">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
