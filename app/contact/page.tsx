import Navigation from '@/components/Navigation';
import Footer from '@/components/Footer';

export default function Contact() {
  return (
    <>
      <Navigation />

      {/* Hero Section */}
      <section className="py-20 hero-gradient">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 animate-fadeIn">
            <h1 className="section-title">Contact Us</h1>
            <p className="section-subtitle">We're here to help plan your perfect adventure</p>
          </div>
        </div>
      </section>

      {/* Contact Info & Form */}
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold text-accent mb-8 dark:text-white">Get In Touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="text-3xl text-primary">📍</div>
                  <div>
                    <h3 className="font-bold text-accent mb-1 dark:text-white">Visit Us</h3>
                    <p className="text-gray-700 dark:text-white">Mountain View Road</p>
                    <p className="text-gray-700 dark:text-white">Nature Valley, Adventure District</p>
                    <p className="text-gray-700 dark:text-white">Philippines</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="text-3xl text-primary">📞</div>
                  <div>
                    <h3 className="font-bold text-accent mb-1 dark:text-white">Call Us</h3>
                    <p className="text-gray-700 dark:text-white">Main Line: +63 123 456 7890</p>
                    <p className="text-gray-700 dark:text-white">Reservations: +63 123 456 7891</p>
                    <p className="text-gray-700 dark:text-white">Emergency: +63 123 456 7892</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="text-3xl text-primary">✉️</div>
                  <div>
                    <h3 className="font-bold text-accent mb-1 dark:text-white">Email Us</h3>
                    <p className="text-gray-700 dark:text-white">General: info@alfarm-resort.com</p>
                    <p className="text-gray-700 dark:text-white">Bookings: reservations@alfarm-resort.com</p>
                    <p className="text-gray-700 dark:text-white">Support: support@alfarm-resort.com</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="text-3xl text-primary">🕐</div>
                  <div>
                    <h3 className="font-bold text-accent mb-1 dark:text-white">Office Hours</h3>
                    <p className="text-gray-700 dark:text-white">Monday - Friday: 8:00 AM - 8:00 PM</p>
                    <p className="text-gray-700 dark:text-white">Saturday - Sunday: 9:00 AM - 6:00 PM</p>
                    <p className="text-gray-700 dark:text-white">24/7 Emergency Support</p>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="mt-8">
                <h3 className="font-bold text-accent mb-4 dark:text-white">Follow Us</h3>
                <div className="flex space-x-4">
                  <a href="#" className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors">
                    f
                  </a>
                  <a href="#" className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors">
                    𝕏
                  </a>
                  <a href="#" className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors">
                    in
                  </a>
                  <a href="#" className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition-colors">
                    📷
                  </a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="bg-gray-50 p-8 rounded-xl shadow-lg dark:bg-accent-dark dark:text-white">
              <h2 className="text-2xl font-bold text-accent mb-6 dark:text-white">Send Us a Message</h2>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-white">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    placeholder="John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    className="input-field"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    className="input-field"
                    placeholder="+63 123 456 7890"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subject *
                  </label>
                  <select className="input-field" required>
                    <option value="">Select a subject</option>
                    <option value="booking">Booking Inquiry</option>
                    <option value="activities">Activities Information</option>
                    <option value="group">Group Bookings</option>
                    <option value="feedback">Feedback</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Message *
                  </label>
                  <textarea
                    required
                    rows={5}
                    className="input-field"
                    placeholder="Tell us how we can help you..."
                  ></textarea>
                </div>

                <button type="submit" className="btn-primary w-full">
                  Send Message
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-16 bg-gray-50 dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-accent mb-8 text-center dark:text-white">Find Us</h2>
            <div className="bg-gray-300 h-96 rounded-xl flex items-center justify-center dark:bg-slate-900">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-gray-600 dark:text-white">Map will be integrated here</p>
                <p className="text-sm text-gray-500 mt-2 dark:text-white">Google Maps / OpenStreetMap</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white dark:bg-slate-950">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-accent mb-8 text-center dark:text-white">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-lg dark:bg-accent-dark dark:text-white">
                <h3 className="font-bold text-accent mb-2 dark:text-white">How do I make a reservation?</h3>
                <p className="text-gray-700 dark:text-white">
                  You can book online through our website, call our reservations team, or email us. We recommend booking at least 2 weeks in advance during peak season.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg dark:bg-accent-dark dark:text-white">
                <h3 className="font-bold text-accent mb-2 dark:text-white">What is your cancellation policy?</h3>
                <p className="text-gray-700 dark:text-white">
                  Free cancellation up to 48 hours before check-in. Cancellations made within 48 hours are subject to a one-night charge.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg dark:bg-accent-dark dark:text-white">
                <h3 className="font-bold text-accent mb-2 dark:text-white">Are activities included in the room rate?</h3>
                <p className="text-gray-700 dark:text-white">
                  Some basic activities like nature trails and farm tours are complimentary. Adventure activities like zip-lining and rock climbing have separate fees.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg dark:bg-accent-dark dark:text-white">
                <h3 className="font-bold text-accent mb-2 dark:text-white">Do you accommodate large groups?</h3>
                <p className="text-gray-700 dark:text-white">
                  Yes! We welcome groups and offer special packages for corporate events, weddings, and family reunions. Contact our group bookings team for details.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg dark:bg-accent-dark dark:text-white">
                <h3 className="font-bold text-accent mb-2 dark:text-white">Is the resort child-friendly?</h3>
                <p className="text-gray-700 dark:text-white">
                  Absolutely! We have activities suitable for all ages, with special programs designed for children. Some adventure activities have age/height restrictions for safety.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}
