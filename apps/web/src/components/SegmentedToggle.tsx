import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type SegmentedOption<V extends string> = { value: V; label: string; icon: LucideIcon };

/** A bordered pill of small buttons; the dex view toggle's markup, made generic. */
function SegmentedToggle<V extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: ReadonlyArray<SegmentedOption<V>>;
  value: V;
  onChange: (value: V) => void;
  ariaLabel: string;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-lg border p-1" role="group" aria-label={ariaLabel}>
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          size="sm"
          variant={value === option.value ? 'default' : 'ghost'}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
        >
          <option.icon className="h-4 w-4 sm:mr-1.5" />
          <span className="hidden sm:inline">{option.label}</span>
        </Button>
      ))}
    </div>
  );
}

export default SegmentedToggle;
