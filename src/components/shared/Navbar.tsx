
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
import { LayoutDashboard, UserCircle, LogOut, UserPlus, LogInIcon, Link2, Menu } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet";
import React from 'react';
import { Skeleton } from '@/components/ui/skeleton'; // Added this line


const Navbar = () => {
  const { user, logout, isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname(); 

  const getInitials = (name?: string) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const commonNavLinks = (isSheet = false) => (
    <>
      {isAuthenticated && user && (
        <>
          {user.role === 'patient' && (
            <Button variant={pathname === '/patient/dashboard' ? 'default' : 'ghost'} className={isSheet ? "w-full justify-start" : ""} onClick={() => { router.push('/patient/dashboard'); if (isSheet) document.getElementById('mobile-nav-close')?.click();}}>
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </Button>
          )}
          {user.role === 'patient' && (
            <Button variant={pathname === '/patient/link-doctor' ? 'default' : 'ghost'}  className={isSheet ? "w-full justify-start" : ""} onClick={() => { router.push('/patient/link-doctor'); if (isSheet) document.getElementById('mobile-nav-close')?.click();}}>
               <Link2 className="mr-2 h-4 w-4" /> Link Doctor
            </Button>
          )}
           {user.role === 'doctor' && (
            <Button variant={pathname === '/doctor/dashboard' ? 'default' : 'ghost'} className={isSheet ? "w-full justify-start" : ""} onClick={() => { router.push('/doctor/dashboard'); if (isSheet) document.getElementById('mobile-nav-close')?.click();}}>
              <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
            </Button>
          )}
        </>
      )}
    </>
  );


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4 md:px-6">
        <Link href="/" className="flex items-center space-x-2" aria-label="MindMirror Home">
          <Logo className="text-primary" />
          <span className="font-headline text-lg sm:text-xl font-semibold text-primary">MindMirror</span>
        </Link>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-2 lg:space-x-4">
          {loading ? (
            <div className="h-8 w-20 animate-pulse rounded-md bg-muted"></div>
          ) : isAuthenticated && user ? (
            <>
              {commonNavLinks()}
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

        {/* Mobile Navigation Trigger */}
        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[280px] p-4">
              <div className="flex flex-col space-y-3">
              <Link href="/" className="flex items-center space-x-2 mb-4 self-start" onClick={() => document.getElementById('mobile-nav-close')?.click()}>
                <Logo className="text-primary h-7 w-7" />
                <span className="font-headline text-xl font-semibold text-primary">MindMirror</span>
              </Link>

              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-9 w-full" />
                  <Skeleton className="h-9 w-full" />
                </div>
              ) : isAuthenticated && user ? (
                <>
                  <div className="flex items-center space-x-3 border-b pb-3 mb-2">
                     <Avatar className="h-10 w-10">
                      <AvatarImage src={`https://placehold.co/40x40.png?text=${getInitials(user.name)}`} alt={user.name || 'User'} data-ai-hint="avatar profile"/>
                      <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium leading-none truncate">{user.name}</p>
                      <p className="text-xs leading-none text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  {commonNavLinks(true)}
                  <Button variant="outline" className="w-full justify-start" onClick={() => { logout(); document.getElementById('mobile-nav-close')?.click(); }}>
                    <LogOut className="mr-2 h-4 w-4" /> Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant={pathname === '/login' ? 'default' : 'ghost'} 
                    className="w-full justify-start"
                    onClick={() => {router.push('/login'); document.getElementById('mobile-nav-close')?.click();}}
                  >
                    <LogInIcon className="mr-2 h-4 w-4" /> Login
                  </Button>
                  <Button 
                    variant={pathname === '/signup' ? 'default' : 'ghost'} 
                    className="w-full justify-start"
                    onClick={() => {router.push('/signup'); document.getElementById('mobile-nav-close')?.click();}}
                  >
                    <UserPlus className="mr-2 h-4 w-4" /> Sign Up
                  </Button>
                </>
              )}
              <SheetClose id="mobile-nav-close" className="hidden"/>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
