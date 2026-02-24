"use client";

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
};


export function LandingHero() {
  return (
    <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-32 bg-background flex flex-col justify-center border-b border-border">
      {/* Subtle architectural background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none"></div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center flex flex-col items-center"
      >
        <motion.div variants={itemVariants} className="inline-flex items-center gap-3 rounded-full border border-primary/20 bg-primary/10 px-5 py-2 text-sm font-medium text-primary mb-10 shadow-sm transition-all duration-300 hover:bg-primary/20 cursor-default">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
          </span>
          <span className="tracking-wide">Introducing PulseTrack V3</span>
        </motion.div>

        <motion.h1 
          variants={itemVariants}
          className="max-w-5xl mx-auto text-5xl font-extrabold tracking-tight sm:text-7xl mb-8 text-foreground leading-[1.15]"
        >
          Manage workflows with <br className="hidden lg:block" />
          <span className="text-primary relative inline-block">
            absolute precision.
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1, delay: 1, ease: "easeOut" }}
              className="absolute -bottom-2 left-0 right-0 h-1 bg-primary/20 origin-left rounded-full"
            />
          </span>
        </motion.h1>

        <motion.p 
          variants={itemVariants}
          className="max-w-2xl mx-auto text-lg text-muted-foreground mb-14 sm:text-xl leading-relaxed"
        >
          A breathtakingly fast, scalable platform for ticketing, time tracking, and professional billing. Engineered for elite teams who prioritize performance.
        </motion.p>

        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row justify-center mb-20 w-full sm:w-auto"
        >
          <Link href="/signup" className="outline-none">
            <motion.div
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              className="group relative inline-flex h-14 w-full sm:w-auto items-center justify-center rounded-xl bg-primary px-10 text-lg font-bold text-primary-foreground shadow-sm transition-shadow duration-300 hover:shadow-lg hover:shadow-primary/20 cursor-pointer"
            >
              <span className="relative z-10 flex items-center gap-2">
                Deploy Your Workspace
                <motion.svg 
                  className="w-5 h-5" 
                  whileHover={{ x: 4 }}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </motion.svg>
              </span>
            </motion.div>
          </Link>
        </motion.div>


      </motion.div>
    </section>
  );
}
