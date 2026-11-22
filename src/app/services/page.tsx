'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, RotateCcw, Search } from 'lucide-react';
import { ServiceCard } from '@/component/services/ServiceCard';
import { toast } from '@/hooks/use-toast';
import { SERVICE_CATEGORIES, type Service } from '@/types/salonbook';

const PAGE_SIZE = 6;

function getServicesUrl(){
  const base = (process.env.NEXT_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  return base ? `${base}/api/v1/services` : '/api/v1/services';
}

function BrowseServicesInner(){
  const searchParams = useSearchParams();
  const initialCategory = searchParams.get('category') || 'All';

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortByPrice, setSortByPrice] = useState<'default' | 'asc' | 'desc'>('default');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setSelectedCategory(initialCategory);
    setCurrentPage(1);
  }, [initialCategory]);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetch(getServicesUrl(), {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (res) =>{
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(data.message || 'Failed to load salon services.');
        }
        return (Array.isArray(data.services) ? data.services : []) as Service[];
      })
      .then((list) =>{
        if (!active) return;
        const normalizedActive = list
          .filter((s) => Boolean(s.isActive))
          .map((s) => ({
            ...s,
            _id: String(s._id),
            priceCents: Number(s.priceCents) || 0,
            durationMinutes: Number(s.durationMinutes) || 0,
          }));
        setServices(normalizedActive);
      })
      .catch((err: Error) => {
        if (!active) return;
        toast({
          title: 'Could not load services',
          description: err.message,
          variant: 'destructive',
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () =>{
      active = false;
    };
  }, []);

  const displayedServices = useMemo(() =>{
    const query = searchQuery.trim().toLowerCase();

    const filtered = services.filter((service) =>{
      const matchesName = !query || service.title.toLowerCase().includes(query);
      const matchesCategory =
        selectedCategory === 'All' ||
        service.category.toLowerCase() === selectedCategory.toLowerCase();
      return matchesName && matchesCategory;
    });

    if (sortByPrice === 'asc'){
      return [...filtered].sort((a, b) => a.priceCents - b.priceCents);
    }
    if (sortByPrice === 'desc'){
      return [...filtered].sort((a, b) => b.priceCents - a.priceCents);
    }
    return filtered;
  }, [services, searchQuery, selectedCategory, sortByPrice]);

  const totalPages = Math.max(1, Math.ceil(displayedServices.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);

  const paginatedServices = useMemo(() =>{
    const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
    return displayedServices.slice(startIndex, startIndex + PAGE_SIZE);
  }, [displayedServices, safeCurrentPage]);

  function resetFilters() {
    setSearchQuery('');
    setSelectedCategory('All');
    setSortByPrice('default');
    setCurrentPage(1);
  }

  function goToPage(page: number) {
    const clamped = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(clamped);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const startItem = displayedServices.length === 0 ? 0 : (safeCurrentPage - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(safeCurrentPage * PAGE_SIZE, displayedServices.length);

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10 sm:px-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Browse Salon Services</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Explore active salon services without signing in.
          </p>
        </div>

        {(searchQuery || selectedCategory !== 'All' || sortByPrice !== 'default') && (
          <button
            type="button"
            onClick={resetFilters}
            className="inline-flex items-center gap-1.5 self-start rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-accent sm:self-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Search, Category Filter & Price Sorting */}
      <div className="grid gap-4 rounded-xl border bg-card p-4 sm:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute top-2.5 left-3 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            aria-label="Search services by name"
            placeholder="Search services by name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-md border bg-background py-2 pr-3 pl-9 text-sm"
          />
        </div>

        <select
          aria-label="Filter by category"
          value={selectedCategory}
          onChange={(e) => {
            setSelectedCategory(e.target.value);
            setCurrentPage(1);
          }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="All">All Categories</option>
          {SERVICE_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>

        <select
          aria-label="Sort services by price"
          value={sortByPrice}
          onChange={(e) => {
            setSortByPrice(e.target.value as 'default' | 'asc' | 'desc');
            setCurrentPage(1);
          }}
          className="rounded-md border bg-background px-3 py-2 text-sm"
        >
          <option value="default">Sort by Price: Default</option>
          <option value="asc">Price: Low to High</option>
          <option value="desc">Price: High to Low</option>
        </select>
      </div>

      {/* Responsive Card Layout */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: PAGE_SIZE }).map((_, index) => (
            <div key={index} className="h-80 animate-pulse rounded-xl border bg-muted/40" />
          ))}
        </div>
      ) : displayedServices.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
          No active services match your search or category filter.
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              Showing {startItem}–{endItem} of {displayedServices.length} active services
            </span>
            <span>
              Page {safeCurrentPage} of {totalPages}
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedServices.map((service) => (
              <ServiceCard key={service._id} service={service} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <nav
              aria-label="Services pagination"
              className="flex flex-wrap items-center justify-center gap-2 pt-4"
            >
              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage - 1)}
                disabled={safeCurrentPage <= 1}
                className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Previous</span>
              </button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNum) => {
                const isActive = pageNum === safeCurrentPage;
                return (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => goToPage(pageNum)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`h-9 w-9 rounded-md border text-xs font-semibold transition ${
                      isActive
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-background hover:bg-accent'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => goToPage(safeCurrentPage + 1)}
                disabled={safeCurrentPage >= totalPages}
                className="inline-flex items-center gap-1 rounded-md border bg-background px-3 py-2 text-xs font-medium hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span>Next</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}

export default function BrowseServicesPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl p-8 text-sm">Loading services...</div>}>
      <BrowseServicesInner />
    </Suspense>
  );
}