'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function Header() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const userInitial = (user?.display_name || user?.email || '?').slice(0, 1).toUpperCase();

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-white/90 backdrop-blur">
      <div className="container mx-auto flex h-16 items-center justify-between gap-4 px-4">
        <Link href="/" className="text-2xl font-bold text-primary">
          学生知恵袋
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          <Button variant="ghost" asChild>
            <Link href="/past-exams">参考資料</Link>
          </Button>
          {isAuthenticated && (
            <Button variant="ghost" asChild>
              <Link href="/threads/new">質問する</Link>
            </Button>
          )}
          {user?.is_admin && (
            <Button variant="ghost" asChild>
              <Link href="/admin/users">管理</Link>
            </Button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild className="md:hidden">
            <Link href="/past-exams">参考資料</Link>
          </Button>
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{userInitial}</AvatarFallback>
                  </Avatar>
                  <div className="hidden text-left md:block">
                    <p className="text-sm font-semibold leading-none">
                      {user?.display_name || user?.email}
                    </p>
                    {user?.total_likes !== undefined && (
                      <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                        <Badge variant="secondary" className="gap-1">
                          <span>👏</span>
                          {user.total_likes}
                        </Badge>
                      </div>
                    )}
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-semibold">
                    {user?.display_name || user?.email}
                  </div>
                  <div className="text-xs text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/past-exams">参考資料</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/threads/new">質問する</Link>
                </DropdownMenuItem>
                {user?.is_admin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin/users">管理</Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={handleLogout}>ログアウト</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">ログイン</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">アカウント作成</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
