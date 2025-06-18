
"use client";
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation'; // Added usePathname
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Logo from '@/components/icons/Logo'; 
import { LayoutDashboard, UserCircle, LogOut, UserPlus, LogInIcon, Link2 } from 'lucide-react';

const Navbar = () => {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); // Get current pathname

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center space-x-2" aria-label="MindMirror Home">
          <Logo className="text-primary" />
          <span className="font-headline text-xl font-semibold text-primary">MindMirror</span>
        </Link>
        
        <nav className="flex items-center space-x-4">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : isAuthenticated && user ? (
            <>
              {user.role === 'patient' && (
                <Button variant="ghost" onClick={() => router.push('/patient/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </Button>
              )}
              {user.role === 'patient' && (
                <Button variant="ghost" onClick={() => router.push('/patient/link-doctor')}>
                   <Link2 className="mr-2 h-4 w-4" /> Link Doctor
                </Button>
              )}
               {user.role === 'doctor' && (
                <Button variant="ghost" onClick={() => router.push('/doctor/dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(user.name)}`} alt={user.name || 'User'} data-ai-hint="avatar profile" />
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button 
                variant={pathname === '/login' ? 'default' : 'ghost'} 
                onClick={() => router.push('/login')}
              >
                <LogInIcon className="mr-2 h-4 w-4" /> Login
              </Button>
              <Button 
                variant={pathname === '/signup' ? 'default' : 'ghost'} 
                onClick={() => router.push('/signup')}
              >
                <UserPlus className="mr-2 h-4 w-4" /> Sign Up
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
