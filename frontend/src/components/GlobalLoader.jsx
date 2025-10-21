import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, BookOpen } from 'lucide-react'

export default function GlobalLoader({ isLoading, loadingText = 'Loading your library...' }) {
  return (
    <AnimatePresence mode="wait">
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800"
        >
          <div className="text-center space-y-8">
            {/* Logo Animation */}
            <motion.div
              initial={{ scale: .5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="w-24 h-24 mx-auto rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-4">
                <BookOpen className="w-12 h-12 text-white" />
              </div>
              
              {/* Animated rings */}
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-white/30"
              />
              <motion.div
                animate={{ rotate: -360 }}
                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                className="absolute inset-2 rounded-xl border border-transparent border-b-white/20"
              />
            </motion.div>

            {/* LibraLink Branding */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="space-y-2"
            >
              <h1 className="text-3xl font-bold text-white">
                Libra<span className="text-pink-300">Link</span>
              </h1>
              <p className="text-white/70 text-lg">Your Digital Bridge to Books</p>
            </motion.div>

            {/* Loading Spinner */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.6 }}
              className="flex items-center justify-center gap-3"
            >
              <Loader2 className="w-6 h-6 text-white animate-spin" />
              <span className="text-white/80 font-medium">{loadingText}</span>
            </motion.div>

            {/* Progress Dots */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.8 }}
              className="flex items-center justify-center gap-2"
            >
              {[...Array(3)].map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{ 
                    duration: 1.5, 
                    repeat: Infinity,
                    delay: i * 0.2
                  }}
                  className="w-2 h-2 bg-white/60 rounded-full"
                />
              ))}
            </motion.div>
          </div>

          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-40">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 border border-white/20 rounded-full animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-48 h-48 border border-white/10 rounded-full animate-pulse delay-1000" />
            <div className="absolute top-1/2 right-1/3 w-24 h-24 border border-white/15 rounded-full animate-pulse delay-500" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
