import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/auth-context';
import GlobalSuccessToast from '@/components/GlobalSuccessToast';

export const metadata: Metadata = {
  title: '学生知恵袋',
  description: '名城大学の学生向けQ&Aプラットフォーム',
};

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" suppressHydrationWarning>
      <body className="bg-background text-foreground">
        <AuthProvider>
          <GlobalSuccessToast />
          <div className="flex min-h-screen flex-col">
            <Header />
            <div className="flex-1">{children}</div>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
