import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { CustomCursor } from '@/components/layout/CustomCursor';
import { WhatsAppFloat } from '@/components/layout/WhatsAppFloat';
import { BackToTop } from '@/components/layout/BackToTop';

import { Hero } from '@/components/sections/Hero';
import { WhyUs } from '@/components/sections/WhyUs';
import { HowItWorks } from '@/components/sections/HowItWorks';
import { Manifesto } from '@/components/sections/Manifesto';
import { Technology } from '@/components/sections/Technology';
import { Differential } from '@/components/sections/Differential';
import { Cases } from '@/components/sections/Cases';
import { Testimonials } from '@/components/sections/Testimonials';
import { Stats } from '@/components/sections/Stats';
import { CTA } from '@/components/sections/CTA';

export default function HomePage() {
  return (
    <>
      <CustomCursor />
      <Navbar />
      <main className="relative">
        <Hero />
        <WhyUs />
        <Manifesto />
        <HowItWorks />
        <Technology />
        <Differential />
        <Cases />
        <Testimonials />
        <Stats />
        <CTA />
      </main>
      <Footer />
      <WhatsAppFloat />
      <BackToTop />
    </>
  );
}
