"use client";

import Link from 'next/link';
import { motion } from 'framer-motion';

export function LandingCTA() {
  return (
    <section className="py-24 bg-background relative overflow-hidden px-4 sm:px-6 lg:px-8">
      <div className="container mx-auto relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 40 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="bg-primary rounded-[3rem] p-12 md:p-20 text-center max-w-5xl mx-auto shadow-2xl relative overflow-hidden border border-primary"
        >
          <div className="relative z-10 flex flex-col items-center">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter mb-8 text-primary-foreground"
            >
              Redefine your structural efficiency.
            </motion.h2>
            
            <motion.p 
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="text-lg md:text-xl text-primary-foreground/90 mb-12 max-w-2xl font-medium leading-relaxed"
            >
              Stop managing tools and start managing output. Deploy PulseTrack today and establish absolute control over your workflow.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.7, duration: 0.6 }}
              className="flex flex-col w-full max-w-sm justify-center"
            >
              <Link
                href="/signup"
                className="outline-none"
              >
                <motion.div 
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="group/btn flex items-center justify-center h-16 bg-background text-primary text-lg font-bold rounded-xl shadow-md hover:shadow-xl transition-shadow"
                >
                  <span className="relative z-10 flex items-center gap-2">
                    Launch Platform
                    <motion.svg 
                      className="w-5 h-5" 
                      whileHover={{ x: 5 }}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </motion.svg>
                  </span>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
