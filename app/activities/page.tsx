import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function Activities() {
  const activities = [
    {
      id: 1,
      name: 'Zip-Lining',
      icon: '🪂',
      description: 'Soar through the treetops on our world-class zip-line courses, ranging from beginner-friendly to extreme adventures.',
      duration: '2-3 hours',
      difficulty: 'All levels',
      highlights: ['6 different zip-line routes', 'Heights up to 200 feet', 'Professional safety equipment', 'Trained guides'],
    },
    {
      id: 2,
      name: 'Nature Hiking',
      icon: '🥾',
      description: 'Explore our extensive trail network through diverse ecosystems, from gentle nature walks to challenging mountain treks.',
      duration: '1-4 hours',
      difficulty: 'Easy to Hard',
      highlights: ['15+ marked trails', 'Wildlife viewing opportunities', 'Scenic viewpoints', 'Guided tours available'],
    },
    {
      id: 3,
      name: 'Rock Climbing',
      icon: '🧗',
      description: 'Challenge yourself on our natural rock faces and indoor climbing walls suitable for all skill levels.',
      duration: '2-3 hours',
      difficulty: 'Beginner to Advanced',
      highlights: ['Indoor and outdoor walls', 'Routes for all levels', 'Equipment provided', 'Instruction included'],
    },
    {
      id: 4,
      name: 'Wildlife Safari',
      icon: '🦌',
      description: 'Join our expert naturalists for guided wildlife viewing tours through our protected conservation areas.',
      duration: '2-3 hours',
      difficulty: 'Easy',
      highlights: ['Deer, birds, and native wildlife', 'Photography opportunities', 'Educational commentary', 'Early morning & sunset tours'],
    },
    {
      id: 5,
      name: 'Obstacle Course',
      icon: '🏃',
      description: 'Test your agility and strength on our exciting obstacle courses designed for fun and fitness.',
      duration: '1-2 hours',
      difficulty: 'Moderate',
      highlights: ['Team building activities', 'Various difficulty levels', 'Rope courses', 'Balance challenges'],
    },
    {
      id: 6,
      name: 'Farm Tours',
      icon: '🚜',
      description: 'Experience authentic farm life, learn about sustainable agriculture, and interact with farm animals.',
      duration: '1.5 hours',
      difficulty: 'Easy',
      highlights: ['Organic farm practices', 'Animal feeding', 'Harvest activities', 'Farm-fresh produce tasting'],
    },
    {
      id: 7,
      name: 'Mountain Biking',
      icon: '🚴',
      description: 'Ride through scenic trails with varying terrain perfect for mountain biking enthusiasts.',
      duration: '2-4 hours',
      difficulty: 'Moderate to Hard',
      highlights: ['Bike rentals available', 'Multiple trail options', 'Forest and mountain routes', 'Guided tours'],
    },
    {
      id: 8,
      name: 'Bird Watching',
      icon: '🦅',
      description: 'Discover the diverse bird species that call our resort home with our expert ornithology guides.',
      duration: '2-3 hours',
      difficulty: 'Easy',
      highlights: ['Over 100 bird species', 'Binoculars provided', 'Early morning tours', 'Photography guidance'],
    },
    {
      id: 9,
      name: 'Fishing',
      icon: '🎣',
      description: 'Enjoy peaceful fishing in our stocked ponds and natural streams.',
      duration: 'Flexible',
      difficulty: 'Easy',
      highlights: ['Equipment rental', 'Catch and release', 'Guided fishing spots', 'Family-friendly'],
    },
    {
      id: 10,
      name: 'Archery',
      icon: '🏹',
      description: 'Learn the ancient art of archery with professional instruction and modern equipment.',
      duration: '1-2 hours',
      difficulty: 'All levels',
      highlights: ['Professional instruction', 'Equipment provided', 'Target practice', 'Competitions available'],
    },
    {
      id: 11,
      name: 'Yoga & Meditation',
      icon: '🧘',
      description: 'Find your zen with outdoor yoga sessions and guided meditation in natural settings.',
      duration: '1 hour',
      difficulty: 'All levels',
      highlights: ['Morning and sunset sessions', 'All experience levels', 'Peaceful forest settings', 'Professional instructors'],
    },
    {
      id: 12,
      name: 'Campfire Nights',
      icon: '🔥',
      description: 'Gather around the campfire for stories, music, and s\'mores under the stars.',
      duration: '2-3 hours',
      difficulty: 'Easy',
      highlights: ['Evening entertainment', 'S\'mores making', 'Live music', 'Stargazing'],
    },
  ];

  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fadeIn">
            <h1 className="section-title">Adventure Activities</h1>
            <p className="section-subtitle">Exciting experiences for every adventurer</p>
          </div>
        </div>
      </section>

      {/* Activities Grid */}
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {activities.map((activity, index) => (
              <div
                key={activity.id}
                className="card"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="text-center mb-4">
                  <div className="text-6xl mb-3">{activity.icon}</div>
                  <h3 className="text-2xl font-bold text-accent mb-2 dark:text-white">{activity.name}</h3>
                </div>
                
                <p className="text-gray-700 mb-4 dark:text-white">{activity.description}</p>
                
                <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                  <div className="bg-primary/10 p-3 rounded-lg text-center dark:bg-accent-dark/60">
                    <p className="text-gray-600 dark:text-white">Duration</p>
                    <p className="font-semibold text-accent dark:text-white">{activity.duration}</p>
                  </div>
                  <div className="bg-secondary/10 p-3 rounded-lg text-center dark:bg-accent-dark/60">
                    <p className="text-gray-600 dark:text-white">Difficulty</p>
                    <p className="font-semibold text-accent dark:text-white">{activity.difficulty}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-accent mb-2 dark:text-white">Highlights:</h4>
                  <ul className="space-y-1">
                    {activity.highlights.map((highlight, idx) => (
                      <li key={idx} className="flex items-start space-x-2 text-sm text-gray-600 dark:text-white">
                        <span className="text-secondary">✓</span>
                        <span>{highlight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Safety Section */}
      <section className="py-16 bg-gray-50 dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-accent mb-4 dark:text-white">Safety First</h2>
              <p className="text-gray-600 dark:text-white">Your safety is our top priority</p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow dark:bg-accent-dark dark:text-white">
                <div className="text-4xl mb-3">🛡️</div>
                <h3 className="text-xl font-bold text-accent mb-3 dark:text-white">Professional Equipment</h3>
                <p className="text-gray-700 dark:text-white">
                  All our adventure equipment meets international safety standards and is regularly inspected and maintained.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow dark:bg-accent-dark dark:text-white">
                <div className="text-4xl mb-3">👨‍🏫</div>
                <h3 className="text-xl font-bold text-accent mb-3 dark:text-white">Certified Guides</h3>
                <p className="text-gray-700 dark:text-white">
                  Our experienced guides are professionally trained and certified in their respective activities and first aid.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow dark:bg-accent-dark dark:text-white">
                <div className="text-4xl mb-3">📋</div>
                <h3 className="text-xl font-bold text-accent mb-3 dark:text-white">Safety Briefings</h3>
                <p className="text-gray-700 dark:text-white">
                  Comprehensive safety instructions and demonstrations are provided before every activity.
                </p>
              </div>

              <div className="bg-white p-6 rounded-lg shadow dark:bg-accent-dark dark:text-white">
                <div className="text-4xl mb-3">🚑</div>
                <h3 className="text-xl font-bold text-accent mb-3 dark:text-white">Emergency Prepared</h3>
                <p className="text-gray-700 dark:text-white">
                  On-site medical facilities and emergency response teams are always ready to assist.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 nature-gradient">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold text-white mb-6">
            Ready for Adventure?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Book your stay and experience all these amazing activities
          </p>
          <a href="/guest/login" className="bg-white text-primary hover:bg-gray-100 font-bold text-lg px-10 py-4 rounded-lg inline-block transition-all duration-300">
            Book Your Adventure
          </a>
        </div>
      </section>

      <Footer />
    </>
  );
}
