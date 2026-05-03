import Link from 'next/link';

export default function VideoNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--surface)' }}>
      <div className="text-center max-w-md">
        <div className="text-7xl mb-6 select-none">🎬</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Video not found</h1>
        <p className="text-gray-500 mb-8 text-sm">
          This video may have been removed or the link is incorrect.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/"
            className="px-6 py-2.5 bg-blue-600 text-white rounded-full font-medium hover:bg-blue-700 transition-colors text-sm">
            Browse videos
          </Link>
          <Link href="/trending"
            className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-full font-medium hover:bg-gray-100 transition-colors text-sm">
            See trending
          </Link>
        </div>
      </div>
    </div>
  );
}
