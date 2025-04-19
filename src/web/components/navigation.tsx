"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <div className="container mx-auto h-16">
        <div className="flex h-full items-center">
          <h1 className="text-lg font-semibold mr-12">OpportunityLens</h1>
          
          <div className="flex space-x-1">
            <Link
              href="/"
              className={`flex items-center space-x-2 px-4 py-2 transition-colors ${
                pathname === '/' 
                  ? 'border-b-2 border-blue-500 text-blue-500' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 13h8M4 13v6h16v-6M4 13V7h16v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span>Dashboard</span>
            </Link>

            <Link
              href="/opportunities"
              className={`flex items-center space-x-2 px-4 py-2 transition-colors ${
                pathname === '/opportunities'
                  ? 'border-b-2 border-blue-500 text-blue-500'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8v8m-4-4h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2"/>
              </svg>
              <span>Opportunities</span>
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
} 