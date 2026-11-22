import { Suspense } from 'react';
import Link from 'next/link';
import { ArrowRight, Sparkles, Award, AlertCircle } from 'lucide-react';
import { FeaturedServicesSection } from '@/component/home/FeaturedServicesSection';

const CATEGORIES = [
  'Haircut & Styling',
  'Hair Coloring',
  'Hair Treatment',
  'Facial & Skincare',
  'Makeup',
  'Manicure & Pedicure',
  'Spa & Massage',
];

interface HomePageProps{
  searchParams: Promise<{ canceled?: string }>;
}

async function CheckoutBannerSection({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const { canceled } = await searchParams;

  if (canceled){
    console.log(
      "Order canceled -- continue to shop around and check out when you're ready."
    );
  }

  if (!canceled){
    return null;
  }

  return(
    <div className="mt-6">
      <div className="inline-flex items-center gap-2 rounded-lg border border-amber-400/50 bg-amber-500/15 px-4 py-2.5 text-xs font-medium text-amber-200">
        <AlertCircle className="h-4 w-4 shrink-0" />
        <span>
          Order canceled -- continue to shop around and check out when you&apos;re ready.
        </span>
      </div>
    </div>
  );
}

export default function HomePage({ searchParams }: HomePageProps){
  return (
    <div className="space-y-16 pb-16">
      {/* Banner Section */}
      <section className="relative overflow-hidden bg-zinc-950 text-white">
        <img
          src="https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1600&q=80"
          alt="SalonBook studio banner"
          className="absolute inset-0 h-full w-full object-cover opacity-40"
        />
        <div className="relative mx-auto flex max-w-7xl flex-col items-start justify-center px-4 py-24 sm:px-6 lg:py-32">
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5"/> SalonBook Studio & Spa
          </span>
          <h1 className="max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
            Crafted Hair, Radiant Skin & Calm Rituals
          </h1>
          <p className="mt-4 max-w-xl text-base text-zinc-200 sm:text-lg">
            Reserve tailored salon appointments online with transparent pricing, exact session times,
            and experienced specialists.
          </p>
          <div className="mt-8">
            <Link
              href="/services"
              className="inline-flex items-center gap-2 rounded-md bg-white px-6 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100 transition"
            >
              <span>Explore Salon Services</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <Suspense fallback={null}>
            <CheckoutBannerSection searchParams={searchParams} />
          </Suspense>
        </div>
      </section>

      {/* Dynamic Section 1: Featured Salon Services (6 Active Services) */}
      <FeaturedServicesSection />

      {/* Dynamic Section 2: Salon Service Categories */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Salon Service Categories</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose a category to explore specialized treatments.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {CATEGORIES.map((category) =>(
            <Link
              key={category}
              href={`/services?category=${encodeURIComponent(category)}` }
              className="group flex items-center justify-between rounded-xl border bg-card p-5 transition hover:border-primary hover:shadow-sm"
            >
              <span className="font-medium">{category}</span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
            </Link>
          )) }
        </div>
      </section>

      {/* Additional Section: Signature Care & Bridal/Event Packages */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="rounded-2xl border bg-muted/40 p-8 flex flex-col gap-6 md:flex-row md:items-center md:justify-between" >
          <div className="space-y-2 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary" >
              <Award className="h-4 w-4" /> Bespoke Salon Packages
            </span>
            <h2 className="text-2xl font-bold">Planning a Bridal, Party, or Makeover Session?</h2>
            <p className="text-sm text-muted-foreground">
              Combine hair styling, makeup, and facial prep into a single coordinated visit with
              upfront pricing and instant confirmation.
            </p>
          </div>
          <Link
            href="/services?category=Makeup"
            className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 shrink-0"
          >
            Explore Makeover Services
          </Link>
        </div>
      </section>
    </div>
  );
}