'use client';

import Link from 'next/link';

export const runtime = 'edge';

export default function NotFound() {
  return (
    <main className="container mx-auto px-4 py-16 text-center">
      <h1 className="text-3xl font-bold">ページが見つかりません</h1>
      <p className="mt-4 text-muted-foreground">
        お探しのページは削除されたか、URLが変更された可能性があります。
      </p>
      <div className="mt-6">
        <Link href="/" className="text-primary underline-offset-4 hover:underline">
          ホームに戻る
        </Link>
      </div>
    </main>
  );
}
