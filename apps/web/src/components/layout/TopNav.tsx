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
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@furniture/shared';

export const TopNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, isOwner, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: Activity, show: true },
    { to: '/orders', label: 'Orders', icon: ShoppingBag, show: true },
    { to: '/customers', label: 'Customers', icon: Users, show: true },
    { to: '/order-stages', label: 'Stages', icon: Layers, show: isOwner },
    { to: '/showroom', label: 'Showroom', icon: Store, show: true },
    { to: '/catalog', label: 'Catalog', icon: Armchair, show: isOwner },
    { to: '/branches', label: 'Branches', icon: Building2, show: isOwner },
    { to: '/my-branch', label: 'My Branch', icon: MapPin, show: !isOwner && isAuthenticated },
    { to: '/system-health', label: 'Health', icon: Building2, show: true },
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

        {/* User profile & Online status */}
        <div className="flex items-center space-x-3">
          <div className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
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
