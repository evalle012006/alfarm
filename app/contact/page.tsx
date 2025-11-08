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
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 max-w-6xl mx-auto">
            {/* Contact Information */}
            <div>
              <h2 className="text-3xl font-bold text-accent mb-8">Get In Touch</h2>
              
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="text-3xl text-primary">📍</div>
                  <div>
                    <h3 className="font-bold text-accent mb-1">Visit Us</h3>
                    <p className="text-gray-700">Mountain View Road</p>
                    <p className="text-gray-700">Nature Valley, Adventure District</p>
                    <p className="text-gray-700">Philippines</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="text-3xl text-primary">📞</div>
                  <div>
                    <h3 className="font-bold text-accent mb-1">Call Us</h3>
                    <p className="text-gray-700">Main Line: +63 123 456 7890</p>
                    <p className="text-gray-700">Reservations: +63 123 456 7891</p>
                    <p className="text-gray-700">Emergency: +63 123 456 7892</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="text-3xl text-primary">✉️</div>
                  <div>
                    <h3 className="font-bold text-accent mb-1">Email Us</h3>
                    <p className="text-gray-700">General: info@alfarm-resort.com</p>
                    <p className="text-gray-700">Bookings: reservations@alfarm-resort.com</p>
                    <p className="text-gray-700">Support: support@alfarm-resort.com</p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="text-3xl text-primary">🕐</div>
                  <div>
                    <h3 className="font-bold text-accent mb-1">Office Hours</h3>
                    <p className="text-gray-700">Monday - Friday: 8:00 AM - 8:00 PM</p>
                    <p className="text-gray-700">Saturday - Sunday: 9:00 AM - 6:00 PM</p>
                    <p className="text-gray-700">24/7 Emergency Support</p>
                  </div>
                </div>
              </div>

              {/* Social Media */}
              <div className="mt-8">
                <h3 className="font-bold text-accent mb-4">Follow Us</h3>
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
            <div className="bg-gray-50 p-8 rounded-xl shadow-lg">
              <h2 className="text-2xl font-bold text-accent mb-6">Send Us a Message</h2>
              
              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
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
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-accent mb-8 text-center">Find Us</h2>
            <div className="bg-gray-300 h-96 rounded-xl flex items-center justify-center">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <p className="text-gray-600">Map will be integrated here</p>
                <p className="text-sm text-gray-500 mt-2">Google Maps / OpenStreetMap</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-accent mb-8 text-center">Frequently Asked Questions</h2>
            
            <div className="space-y-4">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-accent mb-2">How do I make a reservation?</h3>
                <p className="text-gray-700">
                  You can book online through our website, call our reservations team, or email us. We recommend booking at least 2 weeks in advance during peak season.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-accent mb-2">What is your cancellation policy?</h3>
                <p className="text-gray-700">
                  Free cancellation up to 48 hours before check-in. Cancellations made within 48 hours are subject to a one-night charge.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-accent mb-2">Are activities included in the room rate?</h3>
                <p className="text-gray-700">
                  Some basic activities like nature trails and farm tours are complimentary. Adventure activities like zip-lining and rock climbing have separate fees.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-accent mb-2">Do you accommodate large groups?</h3>
                <p className="text-gray-700">
                  Yes! We welcome groups and offer special packages for corporate events, weddings, and family reunions. Contact our group bookings team for details.
                </p>
              </div>

              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="font-bold text-accent mb-2">Is the resort child-friendly?</h3>
                <p className="text-gray-700">
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
