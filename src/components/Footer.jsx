import { Link } from 'react-router-dom'
import { BookOpen, Mail, Phone, MapPin, Github, Twitter, Linkedin, QrCode, Users, Clock } from 'lucide-react'

export default function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-linear-to-br from-gray-50 via-blue-50 to-indigo-50 text-gray-800 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid lg:grid-cols-4 md:grid-cols-2 gap-8">
          
          <div className="lg:col-span-1 space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-linear-to-r from-indigo-500 to-purple-600 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-900">LibraLink</span>
            </div>
            <p className="text-gray-600 leading-relaxed">
              Your Digital Bridge to Books. Revolutionizing library management with smart technology, 
              QR automation, and seamless user experience.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-indigo-600 hover:border-indigo-600 flex items-center justify-center transition-all group shadow-sm">
                <Github className="w-5 h-5 text-gray-600 group-hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-blue-600 hover:border-blue-600 flex items-center justify-center transition-all group shadow-sm">
                <Twitter className="w-5 h-5 text-gray-600 group-hover:text-white" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-white border border-gray-200 hover:bg-blue-700 hover:border-blue-700 flex items-center justify-center transition-all group shadow-sm">
                <Linkedin className="w-5 h-5 text-gray-600 group-hover:text-white" />
              </a>
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Quick Links</h3>
            <ul className="space-y-4">
              <li>
                <Link to="/books" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors">
                  <BookOpen className="w-4 h-4" />
                  Browse Books
                </Link>
              </li>
              <li>
                <Link to="/login" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors">
                  <Users className="w-4 h-4" />
                  Login / Register
                </Link>
              </li>
              <li>
                <Link to="/books" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors">
                  <BookOpen className="w-4 h-4" />
                  Books
                </Link>
              </li>
              <li>
                <Link to="/my-transactions" className="flex items-center gap-2 text-gray-600 hover:text-indigo-600 transition-colors">
                  <Clock className="w-4 h-4" />
                  My Transactions
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Features</h3>
            <ul className="space-y-4 text-gray-600">
              <li>• QR Code Based System</li>
              <li>• Smart Book Search</li>
              <li>• Real-time Availability</li>
              <li>• Automated Late Fees</li>
              <li>• Admin Dashboard</li>
              <li>• Cloud Synchronization</li>
            </ul>
          </div>

          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-gray-900">Contact Info</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-indigo-600 mt-0.5" />
                <div>
                  <p className="text-gray-600">123 Library Street</p>
                  <p className="text-gray-600">Knowledge City, KJ 12345</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-indigo-600" />
                <a href="mailto:support@libralink.com" className="text-gray-600 hover:text-indigo-600 transition-colors">
                  support@libralink.com
                </a>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-indigo-600" />
                <a href="tel:+1234567890" className="text-gray-600 hover:text-indigo-600 transition-colors">
                  +91 1234567890
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>

      <div className="border-t border-gray-300 bg-white/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-500 text-sm">
              © {currentYear} LibraLink. All rights reserved. Built with ❤️ for modern libraries.
            </p>
            <div className="flex items-center gap-6 text-sm">
              <Link to="/privacy" className="text-gray-500 hover:text-indigo-600 transition-colors">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-gray-500 hover:text-indigo-600 transition-colors">
                Terms of Service
              </Link>
              <Link to="/help" className="text-gray-500 hover:text-indigo-600 transition-colors">
                Help Center
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}