import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--surface)' }}>
      <div className="text-center max-w-md">
        <div className="text-8xl mb-6 select-none">🎬</div>
        <h1 className="text-6xl font-bold text-gray-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">Page not found</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors text-sm">
            Go to Home
          </Link>
          <Link href="/trending"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-100 transition-colors text-sm">
            Browse Trending
          </Link>
        </div>
      </div>
    </div>
  );
}
