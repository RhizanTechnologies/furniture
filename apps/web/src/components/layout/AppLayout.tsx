import React from 'react';
import { Outlet } from 'react-router-dom';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';

export const AppLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground pb-20 md:pb-6">
      <TopNav />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-6 max-w-7xl">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
};
