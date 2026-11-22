import Link from 'next/link';
import { Clock, Mail, MapPin, Phone, Scissors } from 'lucide-react';

function InstagramIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function YouTubeIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  );
}

function FacebookIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13.5 22v-8.2h2.7l.4-3.2h-3.1V8.6c0-.9.3-1.6 1.6-1.6h1.7V4.1c-.3 0-1.3-.1-2.5-.1-2.5 0-4.1 1.5-4.1 4.2v2.4H8v3.2h2.8V22h2.7z" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="border-t bg-muted/40 text-sm">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
        <div className="space-y-3">
          <Link href="/" className="flex items-center gap-2 text-lg font-bold">
            <Scissors className="h-5 w-5 text-primary" />
            <span>SalonBook</span>
          </Link>
          <p className="text-muted-foreground leading-relaxed">
            Your destination for haircuts, coloring, skincare, and spa rituals with seamless online
            appointment booking.
          </p>
          <div className="flex items-center gap-2.5 pt-1">
            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Instagram"
              className="rounded-md border p-2 hover:bg-accent"
            >
              <InstagramIcon className="h-4 w-4" />
            </a>
            <a
              href="https://youtube.com"
              target="_blank"
              rel="noreferrer"
              aria-label="YouTube"
              className="rounded-md border p-2 hover:bg-accent"
            >
              <YouTubeIcon className="h-4 w-4" />
            </a>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              aria-label="Facebook"
              className="rounded-md border p-2 hover:bg-accent"
            >
              <FacebookIcon className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Quick Links</h3>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-foreground">
                Home
              </Link>
            </li>
            <li>
              <Link href="/services" className="hover:text-foreground">
                Browse Services
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-foreground">
                Sign In
              </Link>
            </li>
            <li>
              <Link href="/signup" className="hover:text-foreground">
                Sign Up
              </Link>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Contact Information</h3>
          <ul className="space-y-2.5 text-muted-foreground">
            <li className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary shrink-0" />
              <span>+880 1711-223344</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-primary shrink-0" />
              <span>support@salonbook.app</span>
            </li>
          </ul>
        </div>

        <div className="space-y-3">
          <h3 className="font-semibold">Address & Opening Hours</h3>
          <ul className="space-y-2.5 text-muted-foreground">
            <li className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <span>24 Atelier Road, Banani, Dhaka</span>
            </li>
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 text-primary shrink-0 mt-0.5" />
              <div>
                <p>Sat – Thu: 10:00 AM – 8:30 PM</p>
                <p>Friday: 2:00 PM – 9:00 PM</p>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t py-5 text-center text-xs text-muted-foreground">
        © 2026 SalonBook. All rights reserved.
      </div>
    </footer>
  );
}