import Link from 'next/link';
import Image from 'next/image';
import logo from '../images/alfarm_logo.jpg';

export default function Footer() {
  return (
    <footer className="bg-accent text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          {/* About Section */}
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 relative rounded-full overflow-hidden">
                <Image
                  src={logo}
                  alt="AlFarm Logo"
                  fill
                  className="object-cover"
                />
              </div>
              <div>
                <h3 className="font-bold text-lg">AlFarm</h3>
                <p className="text-sm text-gray-300">Resort & Adventure</p>
              </div>
            </div>
            <p className="text-gray-300 text-sm">
              Experience nature, adventure, and comfort in perfect harmony. Your gateway to unforgettable memories.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-bold text-lg mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/about" className="text-gray-300 hover:text-secondary transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/rooms" className="text-gray-300 hover:text-secondary transition-colors">
                  Accommodations
                </Link>
              </li>
              <li>
                <Link href="/activities" className="text-gray-300 hover:text-secondary transition-colors">
                  Activities
                </Link>
              </li>
              <li>
                <Link href="/contact" className="text-gray-300 hover:text-secondary transition-colors">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact Info */}
          <div>
            <h4 className="font-bold text-lg mb-4">Contact Info</h4>
            <ul className="space-y-2 text-gray-300 text-sm">
              <li>📍 Mountain View Road, Nature Valley</li>
              <li>📞 +63 123 456 7890</li>
              <li>✉️ info@alfarm-resort.com</li>
              <li>🕐 24/7 Customer Support</li>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h4 className="font-bold text-lg mb-4">Stay Updated</h4>
            <p className="text-gray-300 text-sm mb-4">
              Subscribe to our newsletter for special offers and updates.
            </p>
            <div className="flex">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-3 py-2 rounded-l-lg text-gray-800 focus:outline-none"
              />
              <button className="bg-secondary hover:bg-secondary-600 px-4 py-2 rounded-r-lg transition-colors">
                →
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-gray-300 text-sm">
          <p>&copy; {new Date().getFullYear()} AlFarm Resort and Adventure Park. All rights reserved.</p>
          <div className="mt-2 space-x-4">
            <Link href="/privacy" className="hover:text-secondary transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-secondary transition-colors">Terms of Service</Link>
            <Link href="/admin/login" className="hover:text-secondary transition-colors">Admin</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
