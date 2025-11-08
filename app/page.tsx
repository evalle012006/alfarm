import Link from 'next/link';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function Home() {
  return (
    <>
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center hero-gradient">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="container mx-auto px-4 text-center relative z-10 animate-fadeIn">
          <h1 className="text-5xl md:text-7xl font-bold text-accent mb-6">
            Welcome to AlFarm Resort
          </h1>
          <p className="text-2xl md:text-3xl text-gray-700 mb-4">
            Where Nature Meets Adventure
          </p>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Experience the perfect blend of relaxation and excitement at our premier resort and adventure park
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/rooms" className="btn-primary text-lg px-8 py-4 inline-block">
              Explore Accommodations
            </Link>
            <Link href="/activities" className="btn-secondary text-lg px-8 py-4 inline-block">
              Discover Activities
            </Link>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
          <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="section-title">Why Choose AlFarm?</h2>
            <p className="section-subtitle">Experience the best of both worlds</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="card text-center">
              <div className="text-6xl mb-4">🏔️</div>
              <h3 className="text-2xl font-bold text-accent mb-3">Adventure Activities</h3>
              <p className="text-gray-600">
                Zip-lining, hiking trails, rock climbing, and more thrilling adventures await you in our expansive park.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card text-center">
              <div className="text-6xl mb-4">🌳</div>
              <h3 className="text-2xl font-bold text-accent mb-3">Nature Immersion</h3>
              <p className="text-gray-600">
                Surrounded by lush forests and pristine nature, reconnect with the environment and find your peace.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card text-center">
              <div className="text-6xl mb-4">🏨</div>
              <h3 className="text-2xl font-bold text-accent mb-3">Luxury Comfort</h3>
              <p className="text-gray-600">
                From cozy cabins to luxury villas, enjoy modern amenities and exceptional comfort during your stay.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Accommodations Preview */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="section-title">Our Accommodations</h2>
            <p className="section-subtitle">Find your perfect retreat</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Room Type 1 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="h-48 bg-gradient-to-br from-primary to-primary-600 flex items-center justify-center">
                <span className="text-6xl">🛏️</span>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-accent mb-2">Standard Rooms</h3>
                <p className="text-gray-600 mb-4">
                  Comfortable and cozy rooms perfect for couples and small families.
                </p>
                <p className="text-3xl font-bold text-primary mb-4">₱1,500<span className="text-lg text-gray-500">/night</span></p>
                <Link href="/rooms" className="btn-outline w-full block text-center">
                  View Details
                </Link>
              </div>
            </div>

            {/* Room Type 2 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="h-48 bg-gradient-to-br from-secondary to-secondary-600 flex items-center justify-center">
                <span className="text-6xl">🏡</span>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-accent mb-2">Deluxe Suites</h3>
                <p className="text-gray-600 mb-4">
                  Spacious suites with stunning views and premium amenities.
                </p>
                <p className="text-3xl font-bold text-primary mb-4">₱4,000<span className="text-lg text-gray-500">/night</span></p>
                <Link href="/rooms" className="btn-outline w-full block text-center">
                  View Details
                </Link>
              </div>
            </div>

            {/* Room Type 3 */}
            <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300">
              <div className="h-48 bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                <span className="text-6xl">🏰</span>
              </div>
              <div className="p-6">
                <h3 className="text-2xl font-bold text-accent mb-2">Private Villas</h3>
                <p className="text-gray-600 mb-4">
                  Exclusive villas with private spaces for ultimate privacy.
                </p>
                <p className="text-3xl font-bold text-primary mb-4">₱6,500<span className="text-lg text-gray-500">/night</span></p>
                <Link href="/rooms" className="btn-outline w-full block text-center">
                  View Details
                </Link>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/rooms" className="btn-primary text-lg inline-block">
              View All Accommodations
            </Link>
          </div>
        </div>
      </section>

      {/* Activities Preview */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="section-title">Adventure Awaits</h2>
            <p className="section-subtitle">Exciting activities for everyone</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-3">🪂</div>
              <h4 className="text-xl font-bold text-accent">Zip-Lining</h4>
            </div>
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-3">🥾</div>
              <h4 className="text-xl font-bold text-accent">Hiking Trails</h4>
            </div>
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-3">🧗</div>
              <h4 className="text-xl font-bold text-accent">Rock Climbing</h4>
            </div>
            <div className="text-center p-6 rounded-xl bg-gradient-to-br from-secondary/10 to-secondary/5 hover:shadow-lg transition-shadow">
              <div className="text-5xl mb-3">🦌</div>
              <h4 className="text-xl font-bold text-accent">Wildlife Tours</h4>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link href="/activities" className="btn-secondary text-lg inline-block">
              Explore All Activities
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 nature-gradient">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready for Your Adventure?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Book your stay today and experience the perfect combination of nature, adventure, and comfort.
          </p>
          <Link href="/guest/login" className="bg-white text-primary hover:bg-gray-100 font-bold text-lg px-10 py-4 rounded-lg inline-block transition-all duration-300 shadow-lg hover:shadow-xl">
            Book Your Stay Now
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
