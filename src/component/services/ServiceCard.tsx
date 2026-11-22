'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Clock } from 'lucide-react';
import type { Service } from '@/types/salonbook';

const FALLBACK_SERVICE_IMAGE =
  'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=900&q=80';

interface ServiceCardProps {
  service: Service;
}

export function ServiceCard({ service }: ServiceCardProps) {
  return (
    <article className="flex flex-col justify-between overflow-hidden rounded-xl border bg-card shadow-sm transition hover:shadow-md">
      <div>
        <div className="relative h-48 w-full bg-muted">
          <Image
            src={service.imageUrl || FALLBACK_SERVICE_IMAGE}
            alt={service.title}
            fill
            className="object-cover"
            unoptimized
          />
        </div>

        <div className="space-y-2.5 p-5">
          <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span className="rounded-full bg-secondary px-2.5 py-0.5 font-medium text-secondary-foreground">
              {service.category}
            </span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {service.durationMinutes} mins
            </span>
          </div>

          <h2 className="text-lg font-semibold tracking-tight">{service.title}</h2>
          <p className="line-clamp-2 text-sm text-muted-foreground">{service.description}</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t px-5 py-4">
        <span className="text-base font-bold">${(service.priceCents / 100).toFixed(2)}</span>
        <Link
          href={`/services/${service._id}`}
          className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:opacity-90"
        >
          View Details
        </Link>
      </div>
    </article>
  );
}