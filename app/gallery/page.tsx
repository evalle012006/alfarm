'use client';

import { useState } from 'react';
import Image from 'next/image';
import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';
import Lightbox from '@/components/ui/Lightbox';

export default function Gallery() {
  const categories = [
    {
      name: 'Rooms & Terraces',
      icon: '🏨',
      images: [
        { title: 'Blue Room (AC)', src: '/images/accommodation/blue_room/blue_room_1.jpeg' },
        { title: 'Blue Room Interior', src: '/images/accommodation/blue_room/blue_room_3.jpeg' },
        { title: 'Orange Terrace', src: '/images/accommodation/orange_terrace/orange_terrace_1.jpeg' },
        { title: 'Orange Terrace View', src: '/images/accommodation/orange_terrace/orange_terrace_3.jpeg' },
        { title: 'Yellow Terrace Standard', src: '/images/accommodation/yellow_terrace/yellow_terrace_1.jpeg' },
        { title: 'Yellow Terrace Deluxe', src: '/images/accommodation/yellow_terrace_1/yellow_terrace_11.jpeg' },
      ],
    },
    {
      name: 'Cottages & Rest Houses',
      icon: '🏡',
      images: [
        { title: 'Dorm Style Cottage', src: '/images/accommodation/dorm_style_cottage/dorm_style_cottage_1.jpeg' },
        { title: 'Dorm Style Interior', src: '/images/accommodation/dorm_style_cottage/dorm_style_cottage_4.jpeg' },
        { title: 'Native Style Cottage', src: '/images/accommodation/native_style_room/native_style_room_1.jpeg' },
        { title: 'Native Style Interior', src: '/images/accommodation/native_style_room/native_style_room_3.jpeg' },
        { title: 'Screen Cottage', src: '/images/accommodation/screen_cottages/screen_cottages_1.jpeg' },
        { title: 'Screen Cottage Interior', src: '/images/accommodation/screen_cottages/screen_cottages_5.jpeg' },
        { title: 'Mini Rest House', src: '/images/accommodation/mini_resthouse/mini_resthouse_1.jpeg' },
        { title: 'Mini Rest House Interior', src: '/images/accommodation/mini_resthouse/mini_resthouse_6.jpeg' },
        { title: 'Rest House', src: '/images/accommodation/rest_house/rest_house_1.jpeg' },
        { title: 'Rest House Interior', src: '/images/accommodation/rest_house/rest_house_7.jpeg' },
      ],
    },
    {
      name: 'Pools & Facilities',
      icon: '🏊',
      images: [
        { title: 'Swimming Pool', src: '/images/accommodation/pools/pool_1.jpeg' },
        { title: 'Pool Area', src: '/images/accommodation/pools/pool_2.jpeg' },
        { title: 'Function Hall', src: '/images/accommodation/function_hall/function_hall_1.jpeg' },
        { title: 'Function Hall Interior', src: '/images/accommodation/function_hall/function_hall_3.jpeg' },
        { title: 'Poolside Tables', src: '/images/accommodation/tables/table_1.jpeg' },
        { title: 'Outdoor Seating', src: '/images/accommodation/tables/table_3.jpeg' },
      ],
    },
    {
      name: 'Adventure',
      icon: '�️',
      images: [
        { title: 'Adventure Activity', src: '/images/features/adventure/adventure-1.jpg' },
        { title: 'Outdoor Fun', src: '/images/features/adventure/adventure-2.jpg' },
        { title: 'Park Exploration', src: '/images/features/adventure/adventure-3.jpg' },
        { title: 'Nature Trail', src: '/images/features/adventure/adventure-4.jpg' },
      ],
    },
  ];

  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentGallery, setCurrentGallery] = useState<{ name: string; images: string[] }>({ name: '', images: [] });
  const [photoIndex, setPhotoIndex] = useState(0);

  const openLightbox = (categoryName: string, images: { title: string; src: string }[], startIndex: number) => {
    setCurrentGallery({ name: categoryName, images: images.map(img => img.src) });
    setPhotoIndex(startIndex);
    setLightboxOpen(true);
  };

  return (
    <>
      <Navigation />

      <Lightbox
        isOpen={lightboxOpen}
        images={currentGallery.images}
        currentIndex={photoIndex}
        onClose={() => setLightboxOpen(false)}
        onPrev={() => setPhotoIndex((prev) => (prev > 0 ? prev - 1 : currentGallery.images.length - 1))}
        onNext={() => setPhotoIndex((prev) => (prev < currentGallery.images.length - 1 ? prev + 1 : 0))}
        title={currentGallery.name}
      />

      {/* Hero Section */}
      <section className="py-20 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fadeIn">
            <h1 className="section-title">Photo Gallery</h1>
            <p className="section-subtitle">Discover the beauty of AlFarm Resort</p>
          </div>
        </div>
      </section>

      {/* Gallery Sections */}
      {categories.map((category, catIndex) => (
        <section
          key={catIndex}
          className={`py-16 ${
            catIndex % 2 === 0
              ? 'bg-white dark:bg-slate-950'
              : 'bg-gray-50 dark:bg-slate-950'
          }`}
        >
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="text-5xl mb-3">{category.icon}</div>
              <h2 className="text-3xl font-bold text-accent mb-2 dark:text-white">{category.name}</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
              {category.images.map((image, imgIndex) => (
                <div
                  key={imgIndex}
                  className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
                  onClick={() => openLightbox(category.name, category.images, imgIndex)}
                >
                  <div className="aspect-[4/3] relative">
                    <Image
                      src={image.src}
                      alt={image.title}
                      fill
                      className="object-cover transition-transform duration-500 group-hover:scale-110"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      quality={75}
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                    <div className="p-4 text-white w-full">
                      <p className="font-semibold">{image.title}</p>
                      <p className="text-sm text-white/80">Click to enlarge</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Video Section */}
      <section className="py-16 bg-gray-900 text-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Experience AlFarm</h2>
            <p className="text-gray-300">Watch our resort tour video</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="aspect-video bg-gray-800 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎥</div>
                <p className="text-gray-400 dark:text-white">Virtual Tour Video</p>
                <p className="text-sm text-gray-500 mt-2 dark:text-white">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 nature-gradient">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Create Your Own Memories
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Book your stay and be part of our story
          </p>
          <a href="/guest/login" className="bg-white text-primary hover:bg-gray-100 font-bold text-lg px-10 py-4 rounded-lg inline-block transition-all duration-300">
            Book Your Stay
          </a>
        </div>
      </section>

      <Footer />
    </>
  );
}
