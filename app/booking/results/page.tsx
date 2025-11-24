import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import PrimaryButton from '@/components/ui/PrimaryButton';

interface ProductOption {
  id: number;
  title: string;
  pricePerNight: number;
  capacity: string[];
  description: string;
  type: 'room' | 'package' | 'day-use';
}

const products: ProductOption[] = [
  {
    id: 1,
    title: 'Standard Room - Garden View',
    pricePerNight: 3200,
    capacity: ['2 Adults', '1 Child'],
    description: 'Cozy room with garden views, perfect for couples or small families.',
    type: 'room',
  },
  {
    id: 2,
    title: 'Family Suite - Mountain View',
    pricePerNight: 5200,
    capacity: ['4 Adults', '2 Children'],
    description: 'Spacious family suite with separate living area and stunning mountain views.',
    type: 'room',
  },
  {
    id: 3,
    title: 'Day-Use Adventure Package',
    pricePerNight: 1800,
    capacity: ['Up to 4 Guests'],
    description: 'Day-use cabana plus access to selected adventure activities.',
    type: 'day-use',
  },
  {
    id: 4,
    title: 'All-In Weekend Package',
    pricePerNight: 7800,
    capacity: ['2 Adults', '2 Children'],
    description: '2 nights accommodation, breakfast, and bundled adventure activities.',
    type: 'package',
  },
];

export default function BookingResultsPage() {
  return (
    <>
      <Navigation />

      {/* Hero / Summary */}
      <section className="py-16 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center animate-fadeIn">
            <h1 className="section-title mb-3">Availability Results</h1>
            <p className="section-subtitle mb-4">
              Choose the perfect stay option for your getaway at AlFarm Resort.
            </p>
            <p className="text-gray-600 dark:text-white">
              Showing available options for your selected dates. You can adjust your selection later
              during checkout.
            </p>
          </div>
        </div>
      </section>

      {/* Filters + Results */}
      <section className="py-12 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Filter Bar (UI-only) */}
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-10">
            <div>
              <p className="text-sm font-semibold text-primary tracking-wide uppercase mb-1">
                Your Search
              </p>
              <h2 className="text-2xl font-bold text-accent dark:text-white mb-1">
                4 options available
              </h2>
              <p className="text-gray-600 dark:text-white text-sm">
                Filters are visual only for now &mdash; booking logic will be added later.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1 dark:text-white">
                  Sort by
                </label>
                <select className="input-field text-sm">
                  <option>Price: Low to High</option>
                  <option>Price: High to Low</option>
                  <option>Capacity: Most Guests</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="block text-xs font-semibold text-gray-600 mb-1 dark:text-white">
                  Product type
                </label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="px-3 py-2 text-xs rounded-full border border-primary text-primary bg-primary/5 hover:bg-primary/10 dark:text-primary-100 dark:border-primary-200"
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 dark:text-white dark:border-slate-600 dark:hover:bg-slate-800"
                  >
                    Rooms
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 dark:text-white dark:border-slate-600 dark:hover:bg-slate-800"
                  >
                    Packages
                  </button>
                  <button
                    type="button"
                    className="px-3 py-2 text-xs rounded-full border border-gray-300 text-gray-700 hover:bg-gray-100 dark:text-white dark:border-slate-600 dark:hover:bg-slate-800"
                  >
                    Day-use
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Product Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {products.map((product) => (
              <article key={product.id} className="card flex flex-col h-full">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-bold text-accent dark:text-white">
                      {product.title}
                    </h3>
                    <span className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary dark:bg-primary-500/20 dark:text-primary-100 capitalize">
                      {product.type}
                    </span>
                  </div>

                  <p className="text-2xl font-bold text-primary mb-1">
                    ₱{product.pricePerNight.toLocaleString()} <span className="text-base font-medium text-gray-600 dark:text-white">/ night</span>
                  </p>

                  <div className="flex flex-wrap gap-2 mt-2 mb-4">
                    {product.capacity.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary dark:bg-accent-dark/60 dark:text-white"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  <p className="text-sm text-gray-600 dark:text-white">
                    {product.description}
                  </p>
                </div>

                <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <p className="text-xs text-gray-500 dark:text-white">
                    Free cancellation up to 48 hours before check-in. Taxes and fees calculated on next step.
                  </p>
                  <PrimaryButton href="/booking/info" className="w-full sm:w-auto text-center">
                    Select Option
                  </PrimaryButton>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
