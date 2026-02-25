"use client";

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

export function LandingHeader() {
  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer outline-none">
            <motion.div 
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="relative flex items-center justify-center p-2 rounded-xl bg-primary/10 border border-primary/20 transition-colors duration-300 group-hover:bg-primary/15"
            >
               <Image
                src="/app-logo.png"
                alt="PulseTrack Logo"
                width={28}
                height={28}
                className="h-7 w-auto relative z-10"
              />
            </motion.div>
            <span className="text-2xl font-bold tracking-tight text-foreground">
              PulseTrack
            </span>
          </Link>

          <nav className="hidden md:flex items-center space-x-10 text-sm font-medium">
            {['Platform', 'Economics', 'Reviews'].map((item) => (
              <motion.a 
                key={item}
                href={`#${item.toLowerCase()}`} 
                whileHover={{ y: -2 }}
                className="text-muted-foreground hover:text-foreground transition-colors duration-300 block"
              >
                {item}
              </motion.a>
            ))}
          </nav>

          <div className="flex items-center gap-6 cursor-pointer">
            <Link
              href="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors duration-300">
              Sign In
            </Link>
            <Link
              href="/signup"
              className="group relative inline-flex items-center justify-center px-6 py-2.5 text-sm font-bold text-primary-foreground transition-all duration-300 rounded-full bg-primary hover:bg-primary/90 shadow-sm hover:shadow-md overflow-hidden outline-none">
              <motion.span 
                className="relative z-10 flex items-center gap-2"
                whileHover={{ x: 3 }}
              >
                Launch Workspace
                <svg className="w-4 h-4 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </motion.span>
            </Link>
          </div>
        </div>
      </div>
    </motion.header>
  );
}
