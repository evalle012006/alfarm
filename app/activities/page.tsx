import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function Activities() {
  const activities = [
    {
      id: 1,
      name: 'Horse Back Riding',
      icon: '🏇',
      description: 'Experience the beauty of our resort on horseback, with guided tours through scenic trails and open meadows.',
      duration: '5 minutes',
      highlights: ['₱50 per 5 minutes', 'Well-trained horses', 'Scenic mountain trails', 'Safety gear provided'],
    },
    {
      id: 2,
      name: 'Cave Tour',
      icon: '🔦',
      description: 'Discover the hidden wonders of our ancient limestone caves with guided exploration tours.',
      duration: '2-3 hours',
      highlights: ['₱50 per person', 'Minimum of 7 persons', 'Experienced cave guides', 'Headlamps provided'],
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

                <div className="grid grid-cols-1 gap-4 mb-4 text-sm text-center">
                  <div className="bg-primary/10 p-3 rounded-lg dark:bg-accent-dark/60">
                    <p className="text-gray-600 dark:text-white">Duration</p>
                    <p className="font-semibold text-accent dark:text-white">{activity.duration}</p>
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
      </section >

      {/* CTA Section */}
      < section className="py-16 nature-gradient" >
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
      </section >

      <Footer />
    </>
  );
}
