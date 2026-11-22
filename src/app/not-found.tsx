import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 text-center space-y-4">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-sm text-muted-foreground">
        The SalonBook page you are looking for does not exist.
      </p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        Back to Home
      </Link>
    </div>
  );
}