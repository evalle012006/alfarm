import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function Gallery() {
  const categories = [
    {
      name: 'Accommodations',
      icon: '🏨',
      images: [
        { title: 'Standard Room Interior', desc: 'Cozy and comfortable' },
        { title: 'Deluxe Suite', desc: 'Spacious luxury' },
        { title: 'Private Villa', desc: 'Ultimate privacy' },
        { title: 'Nature Cabin', desc: 'Rustic charm' },
      ],
    },
    {
      name: 'Adventure Activities',
      icon: '🪂',
      images: [
        { title: 'Zip-Lining', desc: 'Soaring through trees' },
        { title: 'Rock Climbing', desc: 'Reach new heights' },
        { title: 'Hiking Trails', desc: 'Explore nature' },
        { title: 'Obstacle Course', desc: 'Team challenges' },
      ],
    },
    {
      name: 'Nature & Wildlife',
      icon: '🦌',
      images: [
        { title: 'Deer in Natural Habitat', desc: 'Wildlife encounters' },
        { title: 'Forest Trails', desc: 'Lush greenery' },
        { title: 'Mountain Views', desc: 'Breathtaking vistas' },
        { title: 'Sunset Panorama', desc: 'Golden hour magic' },
      ],
    },
    {
      name: 'Facilities',
      icon: '🏊',
      images: [
        { title: 'Adventure Pool', desc: 'Family fun' },
        { title: 'Restaurant', desc: 'Farm-to-table dining' },
        { title: 'Reception Area', desc: 'Welcome center' },
        { title: 'Outdoor Deck', desc: 'Relaxation space' },
      ],
    },
  ];

  return (
    <>
      <Navigation />

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
        <section key={catIndex} className={`py-16 ${catIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <div className="text-5xl mb-3">{category.icon}</div>
              <h2 className="text-3xl font-bold text-accent mb-2">{category.name}</h2>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
              {category.images.map((image, imgIndex) => (
                <div 
                  key={imgIndex}
                  className="group relative overflow-hidden rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 cursor-pointer"
                >
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <div className="text-center p-6">
                      <div className="text-6xl mb-4">{category.icon}</div>
                      <h3 className="font-bold text-accent mb-2">{image.title}</h3>
                      <p className="text-sm text-gray-600">{image.desc}</p>
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end">
                    <div className="p-4 text-white w-full">
                      <p className="font-semibold">{image.title}</p>
                      <p className="text-sm text-white/90">{image.desc}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}

      {/* Video Section */}
      <section className="py-16 bg-gray-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-2">Experience AlFarm</h2>
            <p className="text-gray-300">Watch our resort tour video</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="aspect-video bg-gray-800 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🎥</div>
                <p className="text-gray-400">Virtual Tour Video</p>
                <p className="text-sm text-gray-500 mt-2">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Instagram Feed Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-accent mb-2">Follow Our Adventures</h2>
            <p className="text-gray-600 mb-4">@AlFarmResort on Instagram</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-7xl mx-auto">
            {[...Array(6)].map((_, index) => (
              <div 
                key={index}
                className="aspect-square bg-gradient-to-br from-primary/10 to-secondary/10 rounded-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
              >
                <span className="text-4xl">📷</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <a href="#" className="btn-primary inline-block">
              Follow Us on Instagram
            </a>
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
