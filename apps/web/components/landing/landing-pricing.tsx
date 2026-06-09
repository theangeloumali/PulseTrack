'use client';

import Link from 'next/link';
import {motion, Variants} from 'framer-motion';

const plans = [
  {
    name: 'Standard',
    price: '$29',
    period: '/mo',
    description: 'Essential tools for small, focused teams ready to level up.',
    features: [
      'Up to 5 team members',
      'Unlimited projects and tickets',
      'Core time tracking',
      'Standard billing reports',
      'Community support',
      '5GB storage limit',
    ],
    popular: false,
    cta: 'Initialize Standard',
    href: '/signup',
  },
  {
    name: 'Professional',
    price: '$79',
    period: '/mo',
    description: 'Advanced capacity for scaling agencies and studios.',
    features: [
      'Up to 25 team members',
      'Granular time tracking',
      'Dynamic billing rates',
      'Priority ticket resolution',
      'REST API access',
      '50GB storage limit',
      'Custom workflows',
      'Deep analytics dashboard',
    ],
    popular: true,
    cta: 'Get Started',
    href: '/signup',
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/mo',
    description: 'Uncapped potential for large organizations.',
    features: [
      'Unlimited team members',
      'Custom data integrations',
      'Designated account manager',
      'Guaranteed 99.9% SLA',
      'Unmetered file storage',
      'White-label capabilities',
      'On-premise deployment option',
      'Dedicated compliance team',
    ],
    popular: false,
    cta: 'Contact Sales',
    href: '#contact',
  },
];

const CheckIcon = ({popular}: {popular?: boolean}) => (
  <div
    className={`flex-shrink-0 flex items-center justify-center w-5 h-5 rounded-full mr-3 ${popular ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  </div>
);

const containerVariants: Variants = {
  hidden: {opacity: 0},
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: {opacity: 0, y: 40, scale: 0.95},
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 20,
    },
  },
};

export function LandingPricing() {
  return (
    <section id="pricing" className="py-24 bg-background border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div
          initial={{opacity: 0, y: 20}}
          whileInView={{opacity: 1, y: 0}}
          viewport={{once: true, margin: '-100px'}}
          transition={{duration: 0.7}}
          className="text-center max-w-3xl mx-auto mb-20">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-foreground mb-6">
            Transparent Economics
          </h2>
          <div className="w-16 h-1.5 bg-primary rounded-full mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground">
            Predictable, scalable structures. No hidden fees. Select the configuration that matches
            your operational scale.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{once: true, margin: '-50px'}}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 items-center lg:px-12">
          {plans.map((plan) => (
            <motion.div
              variants={cardVariants}
              whileHover={{y: -10, transition: {duration: 0.2}}}
              key={plan.name}
              className={`relative flex flex-col p-10 bg-card transition-all duration-300 rounded-[2rem] group ${
                plan.popular
                  ? 'border-2 border-primary shadow-xl md:-translate-y-4 md:scale-105 z-10'
                  : 'border border-border shadow-sm hover:border-border/80 hover:shadow-md'
              }`}>
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <motion.div
                    initial={{scale: 0}}
                    animate={{scale: 1}}
                    transition={{delay: 0.8, type: 'spring', stiffness: 200}}
                    className="bg-primary text-primary-foreground px-5 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm">
                    Most Popular
                  </motion.div>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-bold text-card-foreground mb-2 tracking-tight">
                  {plan.name}
                </h3>
                <p className="text-sm text-muted-foreground min-h-[48px]">{plan.description}</p>
              </div>

              <div className="flex items-baseline mb-8 pb-8 border-b border-border">
                <motion.span
                  whileHover={{scale: 1.1}}
                  className="text-5xl font-extrabold tracking-tight text-foreground cursor-default">
                  {plan.price}
                </motion.span>
                <span className="text-lg text-muted-foreground ml-1 font-medium">
                  {plan.period}
                </span>
              </div>

              <ul className="space-y-4 mb-10 grow">
                {plan.features.map((feature) => (
                  <motion.li
                    whileHover={{x: 5}}
                    key={feature}
                    className="flex items-center text-sm text-foreground font-medium transition-transform">
                    <CheckIcon popular={plan.popular} />
                    <span className="leading-tight">{feature}</span>
                  </motion.li>
                ))}
              </ul>

              <Link href={plan.href} className="outline-none">
                <motion.div
                  whileTap={{scale: 0.95}}
                  className={`flex w-full h-12 items-center justify-center text-base font-bold transition-all duration-300 rounded-xl ${
                    plan.popular
                      ? 'bg-primary text-primary-foreground shadow-md hover:shadow-lg'
                      : 'bg-card border border-border text-foreground hover:bg-muted'
                  }`}>
                  {plan.cta}
                </motion.div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
