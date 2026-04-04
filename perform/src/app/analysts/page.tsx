'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion, type Variants } from 'framer-motion';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ANALYSTS } from '@/lib/analysts/personas';
import PaywallGate from '@/components/PaywallGate';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cardVariants: any = {
  hidden: { opacity: 0, y: 40 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.1,
      duration: 0.5,
      ease: 'easeOut' as const,
    },
  }),
};

export default function AnalystsPage() {
  return (
    <PaywallGate>
    <div className="min-h-screen flex flex-col" style={{ background: '#0A0A0F' }}>
      <Header />

      <main className="flex-1 px-6 py-20 max-w-6xl mx-auto w-full">
        {/* Title */}
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <p
            className="text-xs font-mono tracking-[0.3em] mb-3"
            style={{ color: 'rgba(255,255,255,0.3)' }}
          >
            2026 NFL DRAFT
          </p>
          <h1
            className="font-outfit text-4xl md:text-5xl font-extrabold tracking-[0.15em] mb-4"
            style={{ color: '#D4A853' }}
          >
            ON THE CLOCK
          </h1>
          <p className="text-sm font-mono text-white/40 tracking-wider">
            The crew breaks it all down.
          </p>
        </motion.div>

        {/* Analyst Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {ANALYSTS.map((analyst, i) => (
            <motion.div
              key={analyst.id}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              variants={cardVariants}
              className="rounded-xl overflow-hidden flex flex-col transition-all duration-300 hover:translate-y-[-4px]"
              style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = analyst.color;
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${analyst.color}22`;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.06)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              {/* Image */}
              <div className="relative w-full aspect-[4/3] overflow-hidden">
                <Image
                  src={analyst.imagePath}
                  alt={analyst.name}
                  fill
                  className="object-cover object-top"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, #0A0A0F 0%, transparent 60%)`,
                  }}
                />
                {/* Name overlay */}
                <div className="absolute bottom-3 left-4 right-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: analyst.color }}
                    />
                    <h2 className="font-outfit text-xl font-bold tracking-wider text-white drop-shadow-lg">
                      {analyst.name}
                    </h2>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col gap-3 flex-1">
                {/* Descriptor */}
                <p
                  className="text-xs font-mono italic leading-relaxed"
                  style={{ color: analyst.color, opacity: 0.9 }}
                >
                  {analyst.descriptor}
                </p>

                {/* Specialty */}
                <p className="text-xs font-mono text-white/40 leading-relaxed">
                  {analyst.specialty}
                </p>

                {/* Voice Style */}
                <p className="text-[11px] font-mono text-white/25 leading-relaxed">
                  {analyst.voiceStyle}
                </p>

                {/* CTA */}
                <Link
                  href={`/analysts/${analyst.id}`}
                  className="mt-auto inline-block text-center px-4 py-2.5 rounded-md text-xs font-outfit font-bold tracking-[0.15em] transition-all hover:brightness-110"
                  style={{ background: analyst.color, color: '#0A0A0F' }}
                >
                  VIEW FEED
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
    </PaywallGate>
  );
}
