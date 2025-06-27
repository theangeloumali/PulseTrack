'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@workspace/ui/components/button';
import { useAuthStore } from '@/lib/stores/auth';
import { CreateTicketModal } from '@/components/modals/create-ticket-modal';
import { CreateProjectModal } from '@/components/modals/create-project-modal';
import { 
  LayoutDashboard, 
  FolderOpen, 
  Ticket, 
  Clock, 
  Settings, 
  LogOut,
  Menu,
  X,
  Plus,
  Search,
  Bug
} from 'lucide-react';
import { cn } from '@workspace/ui/lib/utils';

interface SidebarLayoutProps {
  children: React.ReactNode;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: FolderOpen },
  { name: 'Tickets', href: '/tickets', icon: Ticket },
  { name: 'Time Tracking', href: '/time-tracking', icon: Clock },
  { name: 'Diagnostics', href: '/diagnostics', icon: Bug },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export function SidebarLayout({ children }: SidebarLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showCreateTicketModal, setShowCreateTicketModal] = useState(false);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, signOut } = useAuthStore();

  const handleLogout = async () => {
    await signOut();
    router.push('/login');
  };

  // Don't show sidebar on auth pages
  const authPages = ['/login', '/signup', '/forgot-password', '/verify-email'];
  const isAuthPage = authPages.some(page => pathname.startsWith(page));
  
  if (!user || isAuthPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:inset-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Logo/Header */}
          <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
            <Link href="/dashboard" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Ticket className="h-5 w-5 text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">TicketFlow</span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="space-y-2">
              <Button 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setShowCreateProjectModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
              <Button 
                size="sm" 
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowCreateTicketModal(true)}
              >
                <Plus className="h-4 w-4 mr-2" />
                New Ticket
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  )}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon
                    className={cn(
                      "mr-3 h-5 w-5",
                      isActive ? "text-blue-700" : "text-gray-400"
                    )}
                  />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User Profile & Logout */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 px-3 py-2">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-gray-700">
                  {user.first_name?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user.first_name || 'User'} {user.last_name || ''}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start mt-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar for mobile */}
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>

      {/* Modals */}
      <CreateTicketModal
        isOpen={showCreateTicketModal}
        onClose={() => setShowCreateTicketModal(false)}
      />
      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => setShowCreateProjectModal(false)}
      />
    </div>
  );
}
