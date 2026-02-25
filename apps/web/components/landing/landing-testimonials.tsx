"use client";

import Image from 'next/image';
import { motion, Variants } from 'framer-motion';

const testimonials = [
  {
    name: 'Sarah Johnson',
    role: 'Operations Director',
    company: 'Nexus Agency',
    content:
      'We discarded three disparate tools when we discovered PulseTrack. The strict separation of time tracking from complex invoicing means our margin of error dropped to near zero. A brilliant interface.',
    avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
  },
  {
    name: 'Michael Chen',
    role: 'Principal Engineer',
    company: 'Independent',
    content:
      'The speed of the UI is unmatched. The drag-and-drop ticket board combined with hot-swappable time tracking makes executing tasks feel fluid and professionally seamless.',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Managing Partner',
    company: 'Vanguard Solutions',
    content:
      'Clear, definitive, and unapologetically fast. The role-based access has allowed us to onboard clients quickly without worrying about data spillage. The visual design is truly premium.',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
  },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 30 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 80,
      damping: 15,
    },
  },
};

const starContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const starVariants: Variants = {
  hidden: { opacity: 0, scale: 0, rotate: -45 },
  visible: { 
    opacity: 1, 
    scale: 1, 
    rotate: 0,
    transition: { type: "spring", stiffness: 300 }
  },
};

export function LandingTestimonials() {
  return (
    <section id="testimonials" className="py-24 bg-muted/30 border-b border-border">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-20"
        >
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-foreground mb-6">
            Proven at Scale
          </h2>
          <div className="w-16 h-1.5 bg-primary rounded-full mx-auto mb-6"></div>
          <p className="text-lg text-muted-foreground">
            Trusted by operators and elite agencies who refuse to compromise on speed and reliability.
          </p>
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
        >
          {testimonials.map((testimonial) => (
            <motion.div
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.2 } }}
              key={testimonial.name}
              className="group relative flex flex-col p-8 bg-card border border-border shadow-sm hover:shadow-md hover:border-border/80 rounded-[2rem]"
            >
              
              <motion.div 
                variants={starContainerVariants}
                className="flex gap-1 mb-6"
              >
                {[...Array(5)].map((_, i) => (
                  <motion.svg 
                    variants={starVariants}
                    key={i} 
                    className="w-5 h-5 text-yellow-500" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                  >
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </motion.svg>
                ))}
              </motion.div>

              <blockquote className="text-lg text-card-foreground leading-relaxed font-medium grow mb-8">
                "{testimonial.content}"
              </blockquote>

              <div className="flex items-center pt-6 mt-auto border-t border-border">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="relative w-12 h-12 rounded-full mr-4 shrink-0 border border-border overflow-hidden bg-muted"
                >
                  <img
                    src={testimonial.avatar}
                    alt={testimonial.name}
                    className="object-cover w-full h-full"
                  />
                </motion.div>
                <div className="flex flex-col">
                  <span className="font-bold text-foreground text-base">{testimonial.name}</span>
                  <span className="text-sm text-muted-foreground mt-0.5">
                    {testimonial.role} at <span className="font-medium text-foreground/80">{testimonial.company}</span>
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
