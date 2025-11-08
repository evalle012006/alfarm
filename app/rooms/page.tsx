import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';

export default function Rooms() {
  const rooms = [
    {
      id: 1,
      name: 'Standard Room',
      type: 'standard',
      icon: '🛏️',
      capacity: 2,
      price: 1500,
      description: 'Comfortable and cozy rooms perfect for couples or solo travelers.',
      features: ['Queen bed', 'WiFi', 'Air conditioning', 'Private bathroom', 'Garden view', 'Mini fridge'],
    },
    {
      id: 2,
      name: 'Deluxe Room',
      type: 'deluxe',
      icon: '🏨',
      capacity: 3,
      price: 2500,
      description: 'Spacious rooms with enhanced amenities and stunning mountain views.',
      features: ['King bed', 'WiFi', 'Air conditioning', 'Private balcony', 'Mountain view', 'Mini bar', 'Work desk'],
    },
    {
      id: 3,
      name: 'Family Suite',
      type: 'suite',
      icon: '🏡',
      capacity: 4,
      price: 4000,
      description: 'Perfect for families with separate living areas and extra space.',
      features: ['2 bedrooms', 'WiFi', 'Air conditioning', 'Living room', 'Kitchenette', 'Forest view', 'Dining area'],
    },
    {
      id: 4,
      name: 'Luxury Villa',
      type: 'villa',
      icon: '🏰',
      capacity: 6,
      price: 6500,
      description: 'Ultimate privacy and luxury with your own private villa.',
      features: ['3 bedrooms', 'WiFi', 'Air conditioning', 'Private pool', 'Full kitchen', 'Outdoor deck', 'BBQ area'],
    },
    {
      id: 5,
      name: 'Nature Cabin',
      type: 'cabin',
      icon: '🏕️',
      capacity: 4,
      price: 3500,
      description: 'Rustic charm meets modern comfort in our eco-friendly cabins.',
      features: ['2 bedrooms', 'WiFi', 'Heating', 'Fireplace', 'Kitchenette', 'Porch with hammock', 'Nature trails access'],
    },
  ];

  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fadeIn">
            <h1 className="section-title">Our Accommodations</h1>
            <p className="section-subtitle">Find your perfect home away from home</p>
          </div>
        </div>
      </section>

      {/* Rooms Grid */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {rooms.map((room, index) => (
              <div key={room.id} className="card" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className="text-5xl">{room.icon}</div>
                    <div>
                      <h3 className="text-2xl font-bold text-accent">{room.name}</h3>
                      <p className="text-gray-600">Up to {room.capacity} guests</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-bold text-primary">₱{room.price}</p>
                    <p className="text-sm text-gray-500">per night</p>
                  </div>
                </div>
                
                <p className="text-gray-700 mb-4">{room.description}</p>
                
                <div className="mb-4">
                  <h4 className="font-semibold text-accent mb-2">Features:</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {room.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center space-x-2 text-sm text-gray-600">
                        <span className="text-secondary">✓</span>
                        <span>{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Link href="/guest/login" className="btn-primary w-full block text-center mt-4">
                  Book Now
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Amenities Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-accent mb-4">All Rooms Include</h2>
            <p className="text-gray-600">Standard amenities across all accommodations</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-6 bg-white rounded-lg shadow">
              <div className="text-4xl mb-3">📶</div>
              <h4 className="font-semibold text-accent">High-Speed WiFi</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow">
              <div className="text-4xl mb-3">❄️</div>
              <h4 className="font-semibold text-accent">Climate Control</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow">
              <div className="text-4xl mb-3">🧴</div>
              <h4 className="font-semibold text-accent">Toiletries</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow">
              <div className="text-4xl mb-3">🧹</div>
              <h4 className="font-semibold text-accent">Daily Housekeeping</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow">
              <div className="text-4xl mb-3">🍽️</div>
              <h4 className="font-semibold text-accent">Room Service</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow">
              <div className="text-4xl mb-3">🔒</div>
              <h4 className="font-semibold text-accent">In-Room Safe</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow">
              <div className="text-4xl mb-3">☕</div>
              <h4 className="font-semibold text-accent">Coffee/Tea</h4>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow">
              <div className="text-4xl mb-3">🌳</div>
              <h4 className="font-semibold text-accent">Nature Views</h4>
            </div>
          </div>
        </div>
      </section>

      {/* Policies Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-accent mb-8 text-center">Booking Information</h2>
            
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-3">⏰</div>
                <h3 className="font-bold text-accent mb-2">Check-In/Out</h3>
                <p className="text-gray-600">Check-in: 2:00 PM</p>
                <p className="text-gray-600">Check-out: 12:00 PM</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">❌</div>
                <h3 className="font-bold text-accent mb-2">Cancellation</h3>
                <p className="text-gray-600">Free cancellation up to 48 hours before arrival</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🐕</div>
                <h3 className="font-bold text-accent mb-2">Pets</h3>
                <p className="text-gray-600">Pet-friendly rooms available upon request</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 nature-gradient">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready to Book Your Stay?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Choose your perfect accommodation and start your adventure today
          </p>
          <Link href="/guest/login" className="bg-white text-primary hover:bg-gray-100 font-bold text-lg px-10 py-4 rounded-lg inline-block transition-all duration-300">
            Book Now
          </Link>
        </div>
      </section>

      <Footer />
    </>
  );
}
