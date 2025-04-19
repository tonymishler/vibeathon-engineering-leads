import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-xl font-semibold">
              OppV<span className="text-blue-500">💡</span>be
            </h1>
            <div className="ml-10 flex items-baseline space-x-4">
              <Link
                href="/"
                className={cn(
                  'text-sm font-medium transition-colors hover:text-primary',
                  pathname === '/' || pathname === ''
                    ? 'text-foreground'
                    : 'text-foreground/60'
                )}
              >
                OppVibe
              </Link>
              <Link
                href="/opportunities"
                className={`px-3 py-2 rounded-md text-sm font-medium ${
                  pathname.startsWith('/opportunities')
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                Opportunities
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
} 