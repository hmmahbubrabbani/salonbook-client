'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export interface SalonService {
  _id: string;
  title: string;
  description: string;
  category: string;
  durationMinutes: number;
  priceCents: number;
  imageUrl?: string;
  isActive: boolean;
}

const PLACEHOLDER_IMG =
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80';

function getServicesEndpoint() {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  return baseUrl ? `${baseUrl}/api/v1/services` : '/api/v1/services';
}

export function FeaturedServicesSection() {
  const [services, setServices] = useState<SalonService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    fetch(getServicesEndpoint(), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Failed to load services from SalonBook server');
        }

        const rawList = Array.isArray(data.services) ? (data.services as SalonService[]) : [];
        const activeOnly = rawList
          .filter((s) => Boolean(s.isActive))
          .map((s) => ({
            ...s,
            _id: String(s._id),
            durationMinutes: Number(s.durationMinutes) || 0,
            priceCents: Number(s.priceCents) || 0,
          }));

        if (active) {
          setServices(activeOnly.slice(0, 6));
        }
      })
      .catch((err: Error) => {
        if (!active) return;
        toast({
          title: 'Could not load featured services',
          description: err.message,
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-6">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Featured Salon Services
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Active services available for immediate booking.
          </p>
        </div>
        <Link
          href="/services"
          className="group inline-flex items-center gap-1 text-sm font-medium text-primary transition-colors hover:underline"
        >
          <span>Browse all</span>
          <span className="transition-transform duration-200 group-hover:translate-x-1">→</span>
        </Link>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-80 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : services.length === 0 ? (
        <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
          No active services found in the database yet.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <article
              key={service._id}
              className="group flex flex-col justify-between overflow-hidden rounded-xl border bg-card shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg"
            >
              <div>
                <div className="relative h-48 w-full overflow-hidden bg-muted">
                  <Image
                    src={service.imageUrl || PLACEHOLDER_IMG}
                    alt={service.title}
                    fill
                    className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    unoptimized
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                </div>

                <div className="space-y-2 p-5">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground transition-colors duration-200 group-hover:bg-primary/15 group-hover:text-primary">
                      {service.category}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> {service.durationMinutes} mins
                    </span>
                  </div>

                  <h3 className="text-lg font-semibold transition-colors duration-200 group-hover:text-primary">
                    {service.title}
                  </h3>

                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {service.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between border-t bg-muted/15 px-5 py-4 transition-colors duration-200 group-hover:bg-muted/30">
                <span className="text-base font-bold">
                  ${(service.priceCents / 100).toFixed(2)}
                </span>
                <Link
                  href={`/services/${service._id}`}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95 hover:shadow-sm"
                >
                  View Details
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}