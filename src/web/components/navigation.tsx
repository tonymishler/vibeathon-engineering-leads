"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <div className="container mx-auto h-16">
        <div className="flex h-full items-center">
          <h1 className="text-2xl font-semibold mr-12">
            OppV<span className="text-blue-500">i</span>be
          </h1>
          
          <div className="flex space-x-1">
            <Link
              href="/"
              className={`${pathname === '/' ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} rounded-md px-3 py-2 text-sm font-medium`}
            >
              Dashboard
            </Link>

            <Link
              href="/opportunities"
              className={`${pathname.startsWith('/opportunities') ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'} rounded-md px-3 py-2 text-sm font-medium`}
            >
              Opportunities
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 