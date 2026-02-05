'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut, User, Upload, FileText, Sparkles, BookOpen, Shield } from 'lucide-react';

export function Navigation() {
  const { user, loading, signInWithGoogle, signOut } = useAuth();
  const pathname = usePathname();

  const navItems = [
    { href: '/documents/upload', label: 'Upload', icon: Upload },
    { href: '/documents', label: 'Library', icon: FileText },
    { href: '/document-parser', label: 'Flashcards', icon: Sparkles },
    { href: '/courses', label: 'Courses', icon: BookOpen },
  ];

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/');

  return (
    <nav className="glass sticky top-0 z-50 border-b border-[var(--border)]">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo/Brand */}
          <div className="flex items-center gap-12">
            <Link
              href="/"
              className="text-xl font-semibold tracking-tight text-[var(--foreground)] hover:opacity-70 transition-opacity"
            >
              StudyHub
            </Link>

            {/* Main Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                      flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                      ${active
                        ? 'bg-[var(--secondary)] text-[var(--foreground)]'
                        : 'text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)]/50'
                      }
                    `}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Actions */}
          <div className="flex items-center gap-3">
            {loading ? (
              <div className="h-9 w-24 animate-pulse rounded-lg bg-[var(--secondary)]" />
            ) : user ? (
              <>
                {user.email && user.email.endsWith('@dartmouth.edu') && (
                  <Link href="/admin">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2"
                    >
                      <Shield className="h-4 w-4" />
                      <span className="hidden sm:inline">Admin</span>
                    </Button>
                  </Link>
                )}
                <Link href="/profile">
                  <button
                    className="flex h-9 items-center gap-2 rounded-lg px-3 transition-all hover:bg-[var(--secondary)]"
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.displayName || 'User'}
                        className="h-7 w-7 rounded-full ring-2 ring-[var(--border)]"
                      />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--secondary)] ring-2 ring-[var(--border)]">
                        <User className="h-4 w-4 text-[var(--muted)]" />
                      </div>
                    )}
                  </button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={signOut}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </>
            ) : (
              <Button
                onClick={signInWithGoogle}
                size="sm"
                className="gap-2 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white"
              >
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
