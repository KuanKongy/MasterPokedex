import React from 'react';

/**
 * Scaffold for the legal pages. Follows the structure conventions of good
 * SaaS policies (single H1, a dated line, bold numbered sections, ALL-CAPS
 * reserved for the warranty and liability sections) so the documents read as
 * documents, not as marketing.
 */

export const LegalSection: React.FC<{
  n: number;
  title: string;
  caps?: boolean;
  children: React.ReactNode;
}> = ({ n, title, caps, children }) => (
  <section className="space-y-3">
    <h2 className="font-bold text-base">
      {n}. {title}
    </h2>
    <div className={`space-y-3 text-sm leading-relaxed text-muted-foreground ${caps ? 'uppercase' : ''}`}>
      {children}
    </div>
  </section>
);

/** The bolded mini-label pattern for practice lists ("Row Level Security: …"). */
export const LabeledItem: React.FC<{ label: string; children: React.ReactNode }> = ({
  label,
  children,
}) => (
  <p>
    <strong className="text-foreground">{label}:</strong> {children}
  </p>
);

const LegalPage: React.FC<{
  title: string;
  updated: string;
  children: React.ReactNode;
}> = ({ title, updated, children }) => (
  <div className="container mx-auto px-4 py-10 max-w-3xl">
    <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight mb-1">{title}</h1>
    <p className="text-sm text-muted-foreground mb-10">Last updated: {updated}</p>
    <div className="space-y-8">{children}</div>
  </div>
);

export default LegalPage;
