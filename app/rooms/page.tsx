'use client';

import { useState } from 'react';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Link from 'next/link';
import Image from 'next/image';
import Lightbox from '@/components/ui/Lightbox';

export default function Rooms() {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentGallery, setCurrentGallery] = useState<{ name: string, images: string[] }>({ name: '', images: [] });
  const [photoIndex, setPhotoIndex] = useState(0);

  const openGallery = (name: string, images: string[], startIndex: number = 0) => {
    setCurrentGallery({ name, images });
    setPhotoIndex(startIndex);
    setLightboxOpen(true);
  };

  const rooms = [
    {
      id: 1,
      name: 'Blue Room (AC)',
      type: 'deluxe',
      icon: '❄️',
      capacity: 2,
      price: 1350,
      description: 'Modern and cool standard room with full air conditioning for a perfect rest.',
      images: [
        '/images/accommodation/blue_room/blue_room_6.jpeg',
        '/images/accommodation/blue_room/blue_room_2.jpeg',
        '/images/accommodation/blue_room/blue_room_3.jpeg',
        '/images/accommodation/blue_room/blue_room_4.jpeg',
        '/images/accommodation/blue_room/blue_room_5.jpeg',
        '/images/accommodation/blue_room/blue_room_1.jpeg',
      ],
      features: ['Air Conditioning', 'WiFi', 'Private Bathroom', 'Fresh Linens', 'Comfortable Bed'],
    },
    {
      id: 2,
      name: 'Dorm Style Cottage',
      type: 'standard',
      icon: '🛖',
      capacity: 10,
      price: 1200,
      description: 'Perfect for large groups or families. Traditional style with massive space.',
      images: [
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_6.jpeg',
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_2.jpeg',
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_3.jpeg',
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_4.jpeg',
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_5.jpeg',
        '/images/accommodation/dorm_style_cottage/dorm_style_cottage_1.jpeg',
      ],
      features: ['Spacious Layout', 'Perfect for Groups', 'Natural Ventilation', 'Electric Fan'],
    },
    {
      id: 3,
      name: 'Orange Terrace',
      type: 'premium',
      icon: '🌅',
      capacity: 15,
      price: 4200,
      description: 'Luxurious terrace room with stunning views and premium space for gatherings.',
      images: [
        '/images/accommodation/orange_terrace/orange_terrace_1.jpeg',
        '/images/accommodation/orange_terrace/orange_terrace_2.jpeg',
        '/images/accommodation/orange_terrace/orange_terrace_3.jpeg',
        '/images/accommodation/orange_terrace/orange_terrace_4.jpeg',
        '/images/accommodation/orange_terrace/orange_terrace_5.jpeg',
      ],
      features: ['Large Terrace', 'Mountain View', 'Premium Furniture', 'Event Ready'],
    },
    {
      id: 4,
      name: 'Native Style Cottage',
      type: 'cabin',
      icon: '🌴',
      capacity: 2,
      price: 950,
      description: 'Experience authentic resort living in our eco-friendly native cottage.',
      images: [
        '/images/accommodation/native_style_room/native_style_room_1.jpeg',
        '/images/accommodation/native_style_room/native_style_room_2.jpeg',
        '/images/accommodation/native_style_room/native_style_room_3.jpeg',
        '/images/accommodation/native_style_room/native_style_room_4.jpeg',
        '/images/accommodation/native_style_room/native_style_room_5.jpeg',
      ],
      features: ['Authentic Design', 'Eco-friendly', 'Garden View', 'Quiet Area'],
    },
    {
      id: 5,
      name: 'Yellow Terrace Standard',
      type: 'deluxe',
      icon: '☀️',
      capacity: 4,
      price: 2800,
      description: 'Cheerful and bright terrace with comfortable amenities for small families.',
      images: [
        '/images/accommodation/yellow_terrace/yellow_terrace_2.jpeg',
        '/images/accommodation/yellow_terrace/yellow_terrace_1.jpeg',
        '/images/accommodation/yellow_terrace/yellow_terrace_3.jpeg',
        '/images/accommodation/yellow_terrace/yellow_terrace_4.jpeg',
        '/images/accommodation/yellow_terrace/yellow_terrace_5.jpeg',
      ],
      features: ['Sunny Views', 'WiFi', 'Private Area', 'Modern Decor'],
    },
    {
      id: 6,
      name: 'Yellow Terrace Deluxe',
      type: 'deluxe',
      icon: '✨',
      capacity: 6,
      price: 3500,
      description: 'Enhanced terrace experience with more space and premium finishes.',
      images: [
        '/images/accommodation/yellow_terrace_1/yellow_terrace_55.jpeg',
        '/images/accommodation/yellow_terrace_1/yellow_terrace_22.jpeg',
        '/images/accommodation/yellow_terrace_1/yellow_terrace_33.jpeg',
        '/images/accommodation/yellow_terrace_1/yellow_terrace_44.jpeg',
        '/images/accommodation/yellow_terrace_1/yellow_terrace_11.jpeg',
        '/images/accommodation/yellow_terrace_1/yellow_terrace_66.jpeg',
      ],
      features: ['Premium Bedding', 'WiFi', 'Exclusive View', 'Luxury Amenities'],
    },
    {
      id: 7,
      name: 'Mini Rest House',
      type: 'villa',
      icon: '🏠',
      capacity: 8,
      price: 3000,
      description: 'A complete home experience in a compact, private rest house setting.',
      images: [
        '/images/accommodation/mini_resthouse/mini_resthouse_1.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_2.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_3.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_4.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_5.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_6.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_7.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_8.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_9.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_10.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_11.jpeg',
        '/images/accommodation/mini_resthouse/mini_resthouse_12.jpeg',
      ],
      features: ['Full Kitchen', 'Private Living Area', 'Outdoor Space', 'Master Bedroom'],
    },
    {
      id: 8,
      name: 'Rest House',
      type: 'villa',
      icon: '🏡',
      capacity: 15,
      price: 8500,
      description: 'Our largest accommodation for the ultimate family or corporate retreat.',
      images: [
        '/images/accommodation/rest_house/rest_house_12.jpeg',
        '/images/accommodation/rest_house/rest_house_2.jpeg',
        '/images/accommodation/rest_house/rest_house_3.jpeg',
        '/images/accommodation/rest_house/rest_house_4.jpeg',
        '/images/accommodation/rest_house/rest_house_5.jpeg',
        '/images/accommodation/rest_house/rest_house_6.jpeg',
        '/images/accommodation/rest_house/rest_house_7.jpeg',
        '/images/accommodation/rest_house/rest_house_8.jpeg',
        '/images/accommodation/rest_house/rest_house_9.jpeg',
        '/images/accommodation/rest_house/rest_house_10.jpeg',
        '/images/accommodation/rest_house/rest_house_11.jpeg',
        '/images/accommodation/rest_house/rest_house_1.jpeg',
        '/images/accommodation/rest_house/rest_house_13.jpeg',
        '/images/accommodation/rest_house/rest_house_14.jpeg',
      ],
      features: ['Multiple Bedrooms', 'Large Kitchen', 'Private Veranda', 'Premium Service'],
    },
    {
      id: 9,
      name: 'Function Hall',
      type: 'hall',
      icon: '🏛️',
      capacity: 50,
      price: 3000,
      description: 'Ideal venue for weddings, birthdays, and corporate events.',
      images: [
        '/images/accommodation/function_hall/function_hall_1.jpeg',
        '/images/accommodation/function_hall/function_hall_2.jpeg',
        '/images/accommodation/function_hall/function_hall_3.jpeg',
        '/images/accommodation/function_hall/function_hall_4.jpeg',
        '/images/accommodation/function_hall/function_hall_5.jpeg',
      ],
      features: ['Sound System', 'Table & Chairs', 'Catering Area', 'AC Available'],
    },
    {
      id: 10,
      name: 'Screen Cottage',
      type: 'standard',
      icon: '🏘️',
      capacity: 15,
      price: 700,
      description: 'Budget-friendly screen cottages for day-use and relaxation.',
      images: [
        '/images/accommodation/screen_cottages/screen_cottages_1.jpeg',
        '/images/accommodation/screen_cottages/screen_cottages_2.jpeg',
        '/images/accommodation/screen_cottages/screen_cottages_3.jpeg',
        '/images/accommodation/screen_cottages/screen_cottages_4.jpeg',
        '/images/accommodation/screen_cottages/screen_cottages_5.jpeg',
        '/images/accommodation/screen_cottages/screen_cottages_6.jpeg',
        '/images/accommodation/screen_cottages/screen_cottages_7.jpeg',
        '/images/accommodation/screen_cottages/screen_cottages_8.jpeg',
      ],
      features: ['Screened Protection', 'Picnic Table', 'Nature View', 'Near Pools'],
    },
    {
      id: 11,
      name: 'Poolside Table',
      type: 'utility',
      icon: '🏖️',
      capacity: 4,
      price: 300,
      description: 'Convenient tables located right by the pool for easy access while swimming.',
      images: [
        '/images/accommodation/tables/table_2.jpeg',
        '/images/accommodation/tables/table_1.jpeg',
        '/images/accommodation/tables/table_3.jpeg',
        '/images/accommodation/tables/table_4.jpeg',
        '/images/accommodation/tables/table_5.jpeg',
      ],
      features: ['Poolside Access', 'Umbrella Provided', 'Near Restrooms'],
    },
    {
      id: 12,
      name: 'Resort Area & Pools',
      type: 'utility',
      icon: '🏊',
      capacity: 0,
      price: 60,
      description: 'Beautiful swimming pools and common areas for all guests to enjoy.',
      images: [
        '/images/accommodation/pools/pool_1.jpeg',
        '/images/accommodation/pools/pool_2.jpeg',
      ],
      features: ['Multiple Pools', 'Clean Water', 'Lifeguards on Duty', 'Beautiful Landscaping'],
    }
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
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            {rooms.map((room, index) => (
              <div key={room.id} className="card overflow-hidden group" style={{ animationDelay: `${index * 100}ms` }}>
                {/* Room Image */}
                <div
                  className="relative h-64 w-full overflow-hidden cursor-pointer"
                  onClick={() => openGallery(room.name, room.images, 0)}
                >
                  <Image
                    src={room.images[0]}
                    alt={room.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-110"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    priority={index < 3}
                    quality={75}
                  />
                  <div className="absolute top-4 right-4 bg-primary text-white px-4 py-1 rounded-full font-bold z-10">
                    ₱{room.price}
                  </div>
                  {/* Gallery Overlay Hint */}
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <div className="bg-white/90 text-primary px-4 py-2 rounded-lg font-bold flex items-center space-x-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>View {room.images.length} Photos</span>
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="text-3xl">{room.icon}</div>
                      <div>
                        <h3 className="text-xl font-bold text-accent dark:text-white">{room.name}</h3>
                        <p className="text-sm text-gray-600 dark:text-white/80">
                          {room.capacity > 0 ? `Up to ${room.capacity} guests` : 'Public Area'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-6 dark:text-white line-clamp-2 h-12 text-sm">{room.description}</p>

                  <div className="mb-6">
                    <h4 className="text-[10px] font-bold text-accent dark:text-white/90 uppercase tracking-widest mb-3">Key Features:</h4>
                    <div className="flex flex-wrap gap-2">
                      {room.features.slice(0, 3).map((feature, idx) => (
                        <span key={idx} className="bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-white/70 text-[10px] px-2 py-1 rounded">
                          {feature}
                        </span>
                      ))}
                      {room.features.length > 3 && (
                        <span className="text-[10px] text-gray-500 dark:text-white/50 pt-1">+{room.features.length - 3} more</span>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => openGallery(room.name, room.images, 0)}
                      className="btn-outline py-2.5 text-xs flex items-center justify-center space-x-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span>Gallery</span>
                    </button>
                    <Link
                      href={`/booking/results?type=${room.type === 'utility' ? 'day' : 'overnight'}&date=${new Date().toISOString().split('T')[0]}&adults=2`}
                      className="btn-primary py-2.5 text-xs text-center"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox component */}
      <Lightbox
        isOpen={lightboxOpen}
        images={currentGallery.images}
        currentIndex={photoIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => setPhotoIndex((prev) => (prev > 0 ? prev - 1 : currentGallery.images.length - 1))}
        onNext={() => setPhotoIndex((prev) => (prev < currentGallery.images.length - 1 ? prev + 1 : 0))}
        title={currentGallery.name}
      />

      {/* Amenities Section */}
      <section className="py-16 bg-gray-50 dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-accent mb-4 dark:text-white">All Rooms Include</h2>
            <p className="text-gray-600 dark:text-white">Standard amenities across all accommodations</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            <div className="text-center p-6 bg-white rounded-lg shadow dark:bg-accent-dark dark:text-white">
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
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-accent mb-8 text-center dark:text-white">Booking Information</h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="text-4xl mb-3">⏰</div>
                <h3 className="font-bold text-accent mb-2 dark:text-white">Check-In/Out</h3>
                <p className="text-gray-600 dark:text-white">Check-in: 2:00 PM</p>
                <p className="text-gray-600 dark:text-white">Check-out: 12:00 PM</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">❌</div>
                <h3 className="font-bold text-accent mb-2 dark:text-white">Cancellation</h3>
                <p className="text-gray-600 dark:text-white">Free cancellation up to 48 hours before arrival</p>
              </div>
              <div className="text-center">
                <div className="text-4xl mb-3">🐕</div>
                <h3 className="font-bold text-accent mb-2 dark:text-white">Pets</h3>
                <p className="text-gray-600 dark:text-white">Pet-friendly rooms available upon request</p>
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
