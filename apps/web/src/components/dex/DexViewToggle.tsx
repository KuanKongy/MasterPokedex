import React from 'react';
import { Grid3x3, LayoutGrid, TableProperties } from 'lucide-react';
import SegmentedToggle, { type SegmentedOption } from '../SegmentedToggle';

export type DexView = 'cards' | 'sprites' | 'table';

export const DEX_VIEWS: ReadonlyArray<SegmentedOption<DexView>> = [
  { value: 'cards', label: 'Cards', icon: LayoutGrid },
  { value: 'sprites', label: 'Sprites', icon: Grid3x3 },
  { value: 'table', label: 'Stats', icon: TableProperties },
];

/** Cards / sprites-only / stats-table — the three ways to browse the dex. */
const DexViewToggle: React.FC<{ view: DexView; onChange: (view: DexView) => void }> = ({ view, onChange }) => (
  <SegmentedToggle options={DEX_VIEWS} value={view} onChange={onChange} ariaLabel="List style" />
);

export default DexViewToggle;
