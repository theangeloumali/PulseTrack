import {LandingCTA} from '@/components/landing/landing-cta';
import {LandingFeatures} from '@/components/landing/landing-features';
import {LandingFooter} from '@/components/landing/landing-footer';
import {LandingHeader} from '@/components/landing/landing-header';
import {LandingHero} from '@/components/landing/landing-hero';
import {LandingPricing} from '@/components/landing/landing-pricing';
import {LandingTestimonials} from '@/components/landing/landing-testimonials';

export function LandingScreen() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/20 selection:text-primary light">
      <LandingHeader />
      <main className="flex flex-col pt-16">
        <LandingHero />
        <LandingFeatures />
        <LandingPricing />
        <LandingTestimonials />
        <LandingCTA />
      </main>
      <LandingFooter />
    </div>
  );
}
