"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === '/' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Dashboard
          </Link>
          <Link
            href="/opportunities"
            className={`text-sm font-medium transition-colors hover:text-primary ${
              pathname === '/opportunities' ? 'text-primary' : 'text-muted-foreground'
            }`}
          >
            Opportunities
          </Link>
        </div>
      </div>
    </nav>
  );
} 