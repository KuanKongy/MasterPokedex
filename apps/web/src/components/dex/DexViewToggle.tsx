import React from 'react';
import { Grid3x3, LayoutGrid, TableProperties } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type DexView = 'cards' | 'sprites' | 'table';

export const DEX_VIEWS: Array<{ value: DexView; label: string; icon: typeof LayoutGrid }> = [
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'sprites', label: 'Sprites', icon: Grid3x3 },
  { value: 'table', label: 'Stats', icon: TableProperties },
];

/** Cards / sprites-only / stats-table — the three ways to browse the dex. */
const DexViewToggle: React.FC<{ view: DexView; onChange: (view: DexView) => void }> = ({ view, onChange }) => (
  <div className="inline-flex items-center gap-1 rounded-lg border p-1" role="group" aria-label="List style">
    {DEX_VIEWS.map((option) => (
      <Button
        key={option.value}
        type="button"
        size="sm"
        variant={view === option.value ? 'default' : 'ghost'}
        aria-pressed={view === option.value}
        onClick={() => onChange(option.value)}
      >
        <option.icon className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">{option.label}</span>
      </Button>
    ))}
  </div>
);

export default DexViewToggle;
