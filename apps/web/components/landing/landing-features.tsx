'use client';

import {motion, Variants} from 'framer-motion';

export const features = [
  {
    title: 'Kinetic Project Boards',
    description:
      'Structure your initiatives with drag-and-drop kanban boards designed for maximum spatial efficiency and smooth interactions.',
    icon: (
      <div className="rounded-xl bg-primary/10 p-3 flex items-center justify-center w-12 h-12">
        <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <rect x="3" y="3" width="7" height="7" strokeWidth="2.5" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" strokeWidth="2.5" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" strokeWidth="2.5" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" strokeWidth="2.5" rx="1.5" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Atomic Time Tracking',
    description:
      'Capture billable segments precisely. Seamlessly linked to tasks without cognitive overhead. Simple visual timer included.',
    icon: (
      <div className="rounded-xl bg-primary/10 p-3 flex items-center justify-center w-12 h-12">
        <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" strokeWidth="2.5" />
          <path d="M12 7v5l3 3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    ),
  },
  {
    title: 'Deterministic Billing',
    description:
      'Generate strict, beautiful PDF invoices automatically mapped from tracked efforts. Never miss a billable hour again.',
    icon: (
      <div className="rounded-xl bg-primary/10 p-3 flex items-center justify-center w-12 h-12">
        <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
  },
  {
    title: 'Role-Based Silos',
    description:
      'Distinct tenancy ensuring users strictly access their authorized projects. Enterprise-level permissions natively built-in.',
    icon: (
      <div className="rounded-xl bg-primary/10 p-3 flex items-center justify-center w-12 h-12">
        <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M12 11c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v3h16v-3c0-2.66-5.33-4-8-4z"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
  },
  {
    title: 'Immutable Ledger',
    description:
      'A permanent, unalterable record of all ticket status changes to prevent accountability disputes between internal teams.',
    icon: (
      <div className="rounded-xl bg-primary/10 p-3 flex items-center justify-center w-12 h-12">
        <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
  },
  {
    title: 'Robust Analytics',
    description:
      'High-level overviews detailing where your resources are allocated and which initiatives generate the most revenue.',
    icon: (
      <div className="rounded-xl bg-primary/10 p-3 flex items-center justify-center w-12 h-12">
        <svg className="h-6 w-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
  },
];

const containerVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: {opacity: 0, y: 20},
  visible: {
    opacity: 1,
    y: 0,
    transition: {duration: 0.6, ease: 'easeOut'},
  },
};

export function LandingFeatures() {
  return (
    <section id="features" className="py-24 bg-muted/30 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{opacity: 0, y: 30}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, margin: '-100px'}}
          transition={{duration: 0.8}}
          className="flex flex-col md:flex-row gap-12 mb-20 items-center">
          <div className="md:w-1/3 text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-6">
              System Capabilities
            </h2>
            <motion.div
              initial={{scaleX: 0}}
              whileInView={{scaleX: 1}}
              viewport={{once: true}}
              transition={{duration: 0.8, delay: 0.4}}
              className="w-16 h-1.5 bg-primary rounded-full mx-auto md:mx-0 origin-left"></motion.div>
          </div>
          <div className="md:w-2/3">
            <p className="text-lg text-muted-foreground leading-relaxed font-medium text-center md:text-left max-w-2xl">
              Engineered with focus. Every feature exists to eliminate friction from your
              operational lifecycle while providing an unparalleled level of structure and clarity.
            </p>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{once: true, margin: '-100px'}}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 gap-y-10">
          {features.map((feature, i) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              whileHover={{y: -5, scale: 1.02}}
              className="group relative flex flex-col items-start p-8 rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
              <motion.div
                whileHover={{rotate: 5, scale: 1.1}}
                transition={{type: 'spring', stiffness: 300}}
                className="mb-6">
                {feature.icon}
              </motion.div>

              <h3 className="text-xl font-bold text-card-foreground mb-3 tracking-tight">
                {feature.title}
              </h3>

              <p className="text-base text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              <motion.div
                className="absolute bottom-0 left-0 w-full h-1 bg-primary origin-left scale-x-0 group-hover:scale-x-100"
                transition={{duration: 0.3, ease: 'easeOut'}}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
