"use client";

import Image from 'next/image';
import { motion, Variants } from 'framer-motion';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function LandingFooter() {
  return (
    <motion.footer 
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
      variants={containerVariants}
      id="contact" 
      className="bg-background border-t border-border pt-20 pb-10 overflow-hidden"
    >
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-12 mb-20 lg:mb-24">
          <motion.div variants={itemVariants} className="md:col-span-2">
            <div className="flex items-center gap-3 mb-8 group cursor-default inline-flex">
              <motion.div 
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
                className="relative flex items-center justify-center p-2 rounded-xl bg-muted border border-border"
              >
                <Image
                  src="/app-logo.png"
                  alt="PulseTrack Logo"
                  width={28}
                  height={28}
                  className="h-7 w-auto relative z-10"
                />
              </motion.div>
              <span className="text-xl font-bold tracking-tight text-foreground">PulseTrack</span>
            </div>
            <p className="text-base text-muted-foreground max-w-sm mb-10 leading-relaxed">
              A meticulously engineered operating system for elite teams. Designed to eliminate friction and scale infinitely.
            </p>
            <div className="flex gap-4">
              {['Twitter', 'GitHub', 'LinkedIn'].map((social, i) => (
                <motion.a 
                  key={social} 
                  href="#" 
                  whileHover={{ y: -4, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className="w-10 h-10 rounded-full bg-muted border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors duration-300"
                >
                  <span className="sr-only">{social}</span>
                  {social === 'Twitter' && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                  )}
                  {social === 'GitHub' && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
                  )}
                  {social === 'LinkedIn' && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  )}
                </motion.a>
              ))}
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Architecture</h3>
            <ul className="space-y-4">
              {[
                { label: 'Platform Interface', href: '#features' },
                { label: 'Pricing Economics', href: '#pricing' },
                { label: 'API Reference', href: '#' },
                { label: 'System Status', href: '#' },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-base text-muted-foreground hover:text-foreground transition-colors duration-300">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Company</h3>
            <ul className="space-y-4">
              {[
                { label: 'Engineering Blog', href: '#' },
                { label: 'Documentation', href: '#' },
                { label: 'Contact Directory', href: '#' },
                { label: 'Careers', href: '#' },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-base text-muted-foreground hover:text-foreground transition-colors duration-300">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <h3 className="text-sm font-bold text-foreground mb-6 uppercase tracking-wider">Legal</h3>
            <ul className="space-y-4">
              {[
                { label: 'Privacy Protocol', href: '#' },
                { label: 'Terms & Conditions', href: '#' },
                { label: 'Data Policy', href: '#' },
                { label: 'Security', href: '#' },
              ].map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-base text-muted-foreground hover:text-foreground transition-colors duration-300">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>
        </div>

        <motion.div 
          variants={itemVariants} 
          className="border-t border-border pt-8 flex flex-col md:flex-row justify-between items-center gap-4"
        >
          <div className="flex flex-col gap-2 items-center md:items-start text-center md:text-left">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} PulseTrack Systems. Engineered for precision.
            </p>
            <p className="text-xs text-muted-foreground/70">
              Made by <a href="https://zkidzdev.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">ZKidz Dev</a> &mdash; <a href="https://zkidzdev.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">zkidzdev.com</a> &mdash; <a href="mailto:angelo@zkidzdev.com" className="hover:text-foreground transition-colors">angelo@zkidzdev.com</a>
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted px-4 py-2 rounded-full border border-border">
            <span className="relative flex h-2 w-2 mr-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            All systems operational
          </div>
        </motion.div>
      </div>
    </motion.footer>
  );
}
