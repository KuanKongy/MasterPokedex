import React from 'react';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

type ColumnToggleProps = {
  columns: ReadonlyArray<{ key: string; label: string }>;
  visible: string[];
  onToggle: (key: string, on: boolean) => void;
};

/** The little display-settings gear every data table carries. Default
    button size (h-10), so it stands as tall as the inputs and selects it
    shares a toolbar with. */
const ColumnToggle: React.FC<ColumnToggleProps> = ({ columns, visible, onToggle }) => (
  <Popover>
    <PopoverTrigger asChild>
      <Button variant="outline" aria-label="Display settings">
        <Settings2 className="h-4 w-4 sm:mr-1.5" />
        <span className="hidden sm:inline">Columns</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-48">
      <p className="mb-2 text-xs font-semibold text-muted-foreground">Show columns</p>
      <div className="space-y-2">
        {columns.map((column) => (
          <label key={column.key} className="flex cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={visible.includes(column.key)}
              onCheckedChange={(checked) => onToggle(column.key, checked === true)}
            />
            {column.label}
          </label>
        ))}
      </div>
    </PopoverContent>
  </Popover>
);

export default ColumnToggle;
