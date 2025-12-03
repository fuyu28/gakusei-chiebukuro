'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/admin/users', label: 'ユーザー管理' },
  { href: '/admin/subject-tags', label: '科目管理' },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="mb-6">
      <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1 text-sm">
        {NAV_ITEMS.map(({ href, label }) => {
          const isActive = pathname?.startsWith(href);

          return (
            <Link
              key={href}
              href={href}
              className={`rounded-md px-4 py-2 font-medium transition ${
                isActive
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-gray-700 hover:bg-white hover:text-blue-700'
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
