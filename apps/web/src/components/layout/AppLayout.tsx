import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { SyncStatusBanner } from './SyncStatusBanner';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopNav />
      <SyncStatusBanner />
      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 md:pt-10 pb-28 md:pb-16 max-w-7xl transition-all">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
