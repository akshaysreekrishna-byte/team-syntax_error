"use client";

import { motion, AnimatePresence } from "framer-motion";

export default function LoadingScreen({ isLoading }: { isLoading: boolean }) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          key="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-3xl flex flex-col items-center justify-center overflow-hidden"
        >
          {/* Abstract Figurines Container */}
          <div className="relative w-64 h-64 flex items-center justify-between">
            {/* Left Figurine (Abstract) */}
            <motion.div
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="w-16 h-32 relative flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-blue-500/80 shadow-[0_0_20px_rgba(59,130,246,0.8)]" />
              <div className="w-16 h-20 mt-2 rounded-t-full bg-blue-500/40 backdrop-blur-md" />
            </motion.div>

            {/* Glowing Particles / Energy Transfer (Center) */}
            <div className="absolute left-1/2 top-1/4 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center space-x-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.5, 1],
                    opacity: [0.3, 1, 0.3],
                    x: [ -10, 10, -10 ],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: "linear",
                    delay: i * 0.2,
                  }}
                  className="w-3 h-3 rounded-full bg-cyan-400 shadow-[0_0_15px_rgba(34,211,238,1)]"
                />
              ))}
            </div>

            {/* Right Figurine (Abstract) */}
            <motion.div
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="w-16 h-32 relative flex flex-col items-center"
            >
              <div className="w-12 h-12 rounded-full bg-purple-500/80 shadow-[0_0_20px_rgba(168,85,247,0.8)]" />
              <div className="w-16 h-20 mt-2 rounded-t-full bg-purple-500/40 backdrop-blur-md" />
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="mt-12 text-white/80 font-mono tracking-widest text-sm"
          >
            ESTABLISHING CONNECTION...
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
