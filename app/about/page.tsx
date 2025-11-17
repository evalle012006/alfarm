import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function About() {
  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fadeIn">
            <h1 className="section-title">About AlFarm Resort</h1>
            <p className="section-subtitle">Your Gateway to Nature and Adventure</p>
          </div>
        </div>
      </section>

      {/* Our Story */}
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl font-bold text-accent mb-6 dark:text-white">Our Story</h2>
                <p className="text-gray-700 mb-4 dark:text-white">
                  AlFarm Resort and Adventure Park was born from a vision to create a unique destination where families and adventure seekers can reconnect with nature while enjoying modern comforts and thrilling activities.
                </p>
                <p className="text-gray-700 mb-4 dark:text-white">
                  Nestled in the heart of pristine wilderness, our resort offers an escape from the hustle and bustle of city life. We've carefully preserved the natural beauty of the land while creating safe, exciting experiences for all ages.
                </p>
                <p className="text-gray-700 dark:text-white">
                  Since our opening, we've welcomed thousands of guests who've created unforgettable memories, from peaceful nature walks to adrenaline-pumping zip-line adventures.
                </p>
              </div>
              <div className="bg-gradient-to-br from-primary to-secondary rounded-2xl p-8 text-white">
                <div className="text-center">
                  <div className="text-6xl mb-4">🌳</div>
                  <h3 className="text-2xl font-bold mb-4">Our Mission</h3>
                  <p className="text-white/90">
                    To provide exceptional outdoor experiences that inspire appreciation for nature while delivering comfort, safety, and unforgettable adventures for every guest.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-16 bg-gray-50 dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-accent mb-4 dark:text-white">Our Core Values</h2>
            <p className="text-gray-600 max-w-2xl mx-auto dark:text-white">
              These principles guide everything we do at AlFarm Resort
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="card text-center">
              <div className="text-5xl mb-4">🌿</div>
              <h3 className="text-xl font-bold text-accent mb-3 dark:text-white">Environmental Stewardship</h3>
              <p className="text-gray-600 dark:text-white">
                We're committed to sustainable practices and preserving the natural environment for future generations.
              </p>
            </div>

            <div className="card text-center">
              <div className="text-5xl mb-4">⭐</div>
              <h3 className="text-xl font-bold text-accent mb-3 dark:text-white">Guest Excellence</h3>
              <p className="text-gray-600 dark:text-white">
                Your satisfaction and safety are our top priorities. We go above and beyond to exceed expectations.
              </p>
            </div>

            <div className="card text-center">
              <div className="text-5xl mb-4">🤝</div>
              <h3 className="text-xl font-bold text-accent mb-3 dark:text-white">Community Impact</h3>
              <p className="text-gray-600 dark:text-white">
                We actively support local communities and contribute to regional economic development.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-accent mb-8 text-center dark:text-white">What Makes Us Special</h2>
            
            <div className="space-y-6">
              <div className="flex items-start space-x-4 bg-primary/5 p-6 rounded-lg dark:bg-accent-dark/60">
                <div className="text-3xl">✅</div>
                <div>
                  <h3 className="text-xl font-bold text-accent mb-2 dark:text-white">150+ Acres of Natural Beauty</h3>
                  <p className="text-gray-700 dark:text-white">
                    Expansive grounds featuring diverse ecosystems, from dense forests to open meadows, with abundant wildlife.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-secondary/5 p-6 rounded-lg dark:bg-accent-dark/60">
                <div className="text-3xl">✅</div>
                <div>
                  <h3 className="text-xl font-bold text-accent mb-2 dark:text-white">World-Class Adventure Facilities</h3>
                  <p className="text-gray-700 dark:text-white">
                    State-of-the-art zip-lines, climbing walls, and obstacle courses maintained to the highest safety standards.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-primary/5 p-6 rounded-lg">
                <div className="text-3xl">✅</div>
                <div>
                  <h3 className="text-xl font-bold text-accent mb-2 dark:text-white">Eco-Friendly Accommodations</h3>
                  <p className="text-gray-700 dark:text-white">
                    Thoughtfully designed rooms and villas that blend seamlessly with nature while providing modern comfort.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-secondary/5 p-6 rounded-lg">
                <div className="text-3xl">✅</div>
                <div>
                  <h3 className="text-xl font-bold text-accent mb-2 dark:text-white">Farm-to-Table Dining</h3>
                  <p className="text-gray-700 dark:text-white">
                    Fresh, locally-sourced ingredients from our own farm and nearby producers, prepared by expert chefs.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-4 bg-primary/5 p-6 rounded-lg">
                <div className="text-3xl">✅</div>
                <div>
                  <h3 className="text-xl font-bold text-accent mb-2 dark:text-white">Expert Guides & Staff</h3>
                  <p className="text-gray-700 dark:text-white">
                    Knowledgeable, friendly team members dedicated to ensuring your safety and enjoyment throughout your stay.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-16 nature-gradient">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 text-center text-white">
            <div>
              <div className="text-5xl font-bold mb-2">10+</div>
              <p className="text-lg text-white/90">Years of Excellence</p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">50K+</div>
              <p className="text-lg text-white/90">Happy Guests</p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">25+</div>
              <p className="text-lg text-white/90">Activities Offered</p>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">100%</div>
              <p className="text-lg text-white/90">Safety Record</p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
