import { Link } from 'react-router-dom'
import { useMemo, useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import useUserRole from './useUserRole'
import { BookOpen, QrCode, ClipboardList, ShieldCheck, Search, LogIn, ArrowRight, AlarmCheck, Loader2 } from 'lucide-react'
import Spline from '@splinetool/react-spline';
import {AnimatePresence, motion} from 'framer-motion'
import AnimatedShowcase from './components/AnimatedShowcase';

export default function Home(){
  const { role, loading: roleLoading } = useUserRole()
  const [user, setUser] = useState(null)
  const [splineLoading, setSplineLoading] = useState(true)
  const [splineError, setSplineError] = useState(false)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  const isLibrarian = role === 'librarian' || role === 'admin'

  const features = [
    {
      icon: <BookOpen className="w-6 h-6 text-white" />,
      title: 'Digital Library',
      desc: 'Access thousands of books with advanced search, filtering, and instant availability checking.'
    },
    {
      icon: <QrCode className="w-6 h-6 text-white" />,
      title: 'QR Code Management',
      desc: 'Seamlessly issue and return books using QR codes from any device, anywhere, anytime.'
    },
    {
      icon: <ClipboardList className="w-6 h-6 text-white" />,
      title: 'PDF Resources',
      desc: 'Upload and manage PDF documents with cover images and interactive FlipHTML5 reading experience.'
    },
    {
      icon: <ShieldCheck className="w-6 h-6 text-white" />,
      title: 'Smart Analytics',
      desc: 'Comprehensive admin dashboard with user management, transaction tracking, and detailed reports.'
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Hero */}
      <section className="px-6 pt-16 pb-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center relative">
            {/* Left Side - Text Content */}
            <motion.div
              className="space-y-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1 }}
            >
              <div className="space-y-6">
                {/* Animated Badge */}
                <motion.div
                  className="inline-flex items-center gap-2 rounded-full bg-indigo-100 px-4 py-2 text-sm font-medium text-indigo-700"
                  initial={{ opacity: 0, y: 20, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: 0.2 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <motion.span
                    className="inline-block w-2 h-2 rounded-full bg-indigo-500"
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                  LibraLink - Smart Library Management
                </motion.div>

                {/* Animated Title */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  className="space-y-2"
                >
                  <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
                    <motion.span
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.6 }}
                      className="inline-block"
                    >
                      Your
                    </motion.span>{' '}
                    <motion.span
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.7 }}
                      className="inline-block"
                    >
                      Digital
                    </motion.span>{' '}
                    <motion.span
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.8 }}
                      className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"
                    >
                      Bridge
                    </motion.span>
                    <br />
                    <motion.span
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, delay: 0.9 }}
                      className="inline-block"
                    >
                      to Books
                    </motion.span>
                  </div>
                </motion.div>

                {/* Animated Description */}
                <motion.p
                  className="text-xl text-gray-600 leading-relaxed max-w-2xl"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.0 }}
                >
                  Experience the future of library management with QR-based automation,
                  instant book discovery, and seamless borrowing – all in one powerful platform.
                </motion.p>
              </div>

              {/* Animated Action Buttons */}
              <motion.div
                className="flex flex-col sm:flex-row gap-4"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.1 }}
              >
                <motion.div
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 17 }}
                >
                  <Link
                    to="/books"
                    className="inline-flex items-center justify-center gap-3 rounded-xl bg-indigo-600 px-8 py-4 text-lg font-semibold text-white shadow-lg transform transition-all duration-200 hover:bg-indigo-700 hover:shadow-xl relative overflow-hidden group"
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-indigo-700 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      initial={false}
                      whileHover={{ scale: 1.1 }}
                    />
                    <motion.div
                      className="relative z-10 flex items-center gap-3"
                      whileHover={{ x: 2 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Search className="w-5 h-5" />
                      Explore Books
                    </motion.div>
                  </Link>
                </motion.div>

                {user ? (
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Link
                      to="/my-transactions"
                      className="inline-flex items-center justify-center gap-3 rounded-xl border-2 border-gray-300 px-8 py-4 text-lg font-semibold text-gray-700 bg-white shadow-sm transform transition-all duration-200 hover:border-indigo-300 hover:shadow-md relative overflow-hidden group"
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        initial={false}
                        whileHover={{ scale: 1.1 }}
                      />
                      <motion.div
                        className="relative z-10 flex items-center gap-3"
                        whileHover={{ x: 2 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <ClipboardList className="w-5 h-5" />
                        My Library
                      </motion.div>
                    </Link>
                  </motion.div>
                ) : (
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Link
                      to="/login"
                      className="inline-flex items-center justify-center gap-3 rounded-xl border-2 border-gray-300 px-8 py-4 text-lg font-semibold text-gray-700 bg-white shadow-sm transform transition-all duration-200 hover:border-indigo-300 hover:shadow-md relative overflow-hidden group"
                    >
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-purple-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        initial={false}
                        whileHover={{ scale: 1.1 }}
                      />
                      <motion.div
                        className="relative z-10 flex items-center gap-3"
                        whileHover={{ x: 2 }}
                        transition={{ type: "spring", stiffness: 400 }}
                      >
                        <LogIn className="w-5 h-5" />
                        Get Started
                      </motion.div>
                    </Link>
                  </motion.div>
                )}
              </motion.div>

              {/* Animated Quick Stats */}
              <motion.div
                className="flex items-center gap-8 pt-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1.2 }}
              >
                <motion.div
                  className="text-center"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div
                    className="text-2xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.4, type: "spring" }}
                  >
                    10K+
                  </motion.div>
                  <div className="text-sm text-gray-600">Books Available</div>
                </motion.div>
                <motion.div
                  className="text-center"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div
                    className="text-2xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.5, type: "spring" }}
                  >
                    500+
                  </motion.div>
                  <div className="text-sm text-gray-600">Active Users</div>
                </motion.div>
                <motion.div
                  className="text-center"
                  whileHover={{ scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <motion.div
                    className="text-2xl font-bold text-gray-900"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ duration: 0.5, delay: 1.6, type: "spring" }}
                  >
                    24/7
                  </motion.div>
                  <div className="text-sm text-gray-600">Access</div>
                </motion.div>
              </motion.div>

              {/* Animated Admin Quick Access */}
              {isLibrarian && (
                <motion.div
                  className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4"
                  initial={{ opacity: 0, y: 20, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.6, delay: 1.7 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                >
                  <div className="flex items-center gap-3">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                    >
                      <ShieldCheck className="w-6 h-6 text-amber-600" />
                    </motion.div>
                    <div className="flex-1">
                      <motion.h3
                        className="font-semibold text-amber-800"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 1.8 }}
                      >
                        Admin Access
                      </motion.h3>
                      <motion.p
                        className="text-sm text-amber-700"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.4, delay: 1.9 }}
                      >
                        Manage books, users, and transactions
                      </motion.p>
                    </div>
                    <motion.div
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400 }}
                    >
                      <Link
                        to="/admin"
                        className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-all duration-200 relative overflow-hidden group"
                      >
                        <motion.div
                          className="absolute inset-0 bg-gradient-to-r from-amber-700 to-orange-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                          initial={false}
                          whileHover={{ scale: 1.1 }}
                        />
                        <motion.span
                          className="relative z-10"
                          whileHover={{ x: 2 }}
                          transition={{ type: "spring", stiffness: 400 }}
                        >
                          Dashboard
                        </motion.span>
                      </Link>
                    </motion.div>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* Right Side - 3D Model */}
            <div className="hidden lg:flex absolute left-100 -top-5 items-center justify-center bg-greenb-500 w-250">
                <div className="w-full h-140 flex items-center justify-center relative">
                  {splineLoading && !splineError && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute top-50 left-120 flex items-center justify-center bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl"
                    >
                      <div className="text-center space-y-4">
                        <Loader2 className="w-12 h-12 text-indigo-600 animate-spin mx-auto" />
                        <p className="text-indigo-700 font-medium">Loading 3D Experience...</p>
                      </div>
                    </motion.div>
                  )}

                  {splineError ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl"
                    >
                      <div className="text-center space-y-4 p-6">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gray-200 flex items-center justify-center">
                          <BookOpen className="w-8 h-8 text-gray-500" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">3D Model Unavailable</h3>
                          <p className="text-gray-600 text-sm">The interactive 3D experience couldn't load, but you can still explore our library!</p>
                        </div>
                        <Link
                          to="/books"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                          <Search className="w-4 h-4" />
                          Browse Books
                        </Link>
                      </div>
                    </motion.div>
                  ) : (
                    <Spline
                      className=''
                      scene="https://prod.spline.design/e8IAFDUwjeTnEZl4/scene.splinecode"
                      onLoad={() => setSplineLoading(false)}
                      onError={() => {
                        setSplineLoading(false)
                        setSplineError(true)
                      }}
                    />
                  )}
                </div>

                {/* floating balls
                <div className="absolute -top-4 left-1/4 w-6 h-6 bg-pink-500 rounded-full opacity-25 animate-bounce delay-300"></div>
                <div className="absolute left-30 bottom-30 w-[40px] h-[40px] rounded-full opacity-30 bg-red-400 animate-pulse"></div> */}

              {/* Overriding logo 😎 */}
              {/* <div className="absolute -top-4 left-75 w-150 h-150 border rounded pointer-events-none"></div> */}
              <div className="absolute bottom-4 right-5 w-35 h-11 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg pointer-events-none">
                <div className="flex items-center justify-center gap-2 px-3">
                  <AlarmCheck className="w-5 h-5 text-white" />
                  <span className="text-white text-sm font-semibold">24/7 Access</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 pb-16">
        <div className="max-w-7xl mx-auto">
          {/* Section Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Libraries
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Streamline your library operations with cutting-edge technology and intuitive design
            </p>
          </motion.div>

          {/* Feature Cards */}
          <div

            className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((f, i) => (
              <AnimatePresence key={i}>
              <motion.div
                initial={{ y: 20 }}
                whileInView={{ y: 0 }}
                transition={{ duration: .8, delay: i * 0.2 }}
                className="group rounded-2xl bg-white shadow-lg ring-1 ring-gray-100 p-6 transform transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:ring-indigo-200">
                <div className="space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    {f.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{f.title}</h3>
                    <p className="text-gray-600 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
              </AnimatePresence>
            ))}
          </div>

          {/* How It Works */}
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-3xl p-8 sm:p-12 mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-center mb-12">
              <h3 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
                How LibraLink Works
              </h3>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Three simple steps to revolutionize your library experience
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-8">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-green-400 to-blue-500 flex items-center justify-center text-white text-2xl font-bold">
                  1
                </div>
                <h4 className="text-xl font-semibold text-gray-900">Search & Discover</h4>
                <p className="text-gray-600">Find your desired books instantly with our smart search and filtering system</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y:20}}
                whileInView={{ opacity: 1, y:0 }}
                transition={{ duration: .5 }}
                className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-purple-400 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
                  2
                </div>
                <h4 className="text-xl font-semibold text-gray-900">Scan QR Code</h4>
                <p className="text-gray-600">Simply scan the book's QR code to issue or return books in seconds</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center text-white text-2xl font-bold">
                  3
                </div>
                <h4 className="text-xl font-semibold text-gray-900">Manage & Track</h4>
                <p className="text-gray-600">Keep track of due dates, renewals, and late fees from your dashboard</p>
              </motion.div>
            </div>
          </div>

          {/* Quick Action Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            <Link to="/books" className="group rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg hover:shadow-2xl p-8 transform transition-all duration-300 hover:scale-105">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white/20 p-2">
                      <BookOpen className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-xl font-semibold">Find Your Next Read</h4>
                  </div>
                  <p className="text-blue-100">
                    Explore our vast collection of books across all genres and subjects
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </motion.div>
            </Link>

            <Link to={user ? '/my-transactions' : '/login'} className="group rounded-2xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg hover:shadow-2xl p-8 transform transition-all duration-300 hover:scale-105">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5 }}
                className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-white/20 p-2">
                      <ClipboardList className="w-6 h-6 text-white" />
                    </div>
                    <h4 className="text-xl font-semibold">
                      {user ? 'Manage Your Library' : 'Start Your Journey'}
                    </h4>
                  </div>
                  <p className="text-purple-100">
                    {user ? 'View borrowed books, due dates, and renew with one click' : 'Sign up to access our digital library services'}
                  </p>
                </div>
                <ArrowRight className="w-6 h-6 text-white/70 group-hover:text-white group-hover:translate-x-1 transition-all" />
              </motion.div>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 pb-16">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-3xl text-white p-8 sm:p-12 text-center">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4">
              Ready to Transform Your Library Experience?
            </h3>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              Join thousands of users who have already discovered the future of library management
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {!user ? (
                <>
                  <Link
                    to="/register"
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-lg font-semibold text-white transform transition-all duration-200 hover:bg-indigo-700 hover:scale-105"
                  >
                    Get Started Free
                  </Link>
                  <Link
                    to="/books"
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-600 px-8 py-3 text-lg font-semibold text-white hover:bg-gray-800 transition-colors"
                  >
                    Explore Books
                  </Link>
                </>
              ) : (
                <Link
                  to="/books"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-3 text-lg font-semibold text-white transform transition-all duration-200 hover:bg-indigo-700 hover:scale-105"
                >
                  <Search className="w-5 h-5" />
                  Browse Our Collection
                </Link>
              )}
            </div>
          </motion.div>
        </div>
        <AnimatedShowcase />
      </section>
    </div>
  )
}
