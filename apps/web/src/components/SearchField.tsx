import React from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder?: string;
  'aria-label'?: string;
  /** Layout classes for the form wrapper (flex-1, w-full max-w-md, ...). */
  className?: string;
};

/**
 * A joined search input + submit button. The focus ring lives on the wrapper
 * (focus-within), because the Input and Button each drawing their own
 * ring-2 + offset box cuts the seam between them into two rounded outlines.
 * Both children must zero the ring AND the offset, or an offset halo remains.
 */
const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChange,
  onSubmit,
  placeholder,
  className,
  ...rest
}) => (
  <form
    onSubmit={(e) => {
      e.preventDefault();
      onSubmit();
    }}
    className={cn(
      'flex rounded-md ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
      className,
    )}
  >
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={rest['aria-label'] ?? placeholder}
      className="rounded-r-none focus-visible:ring-0 focus-visible:ring-offset-0"
    />
    <Button
      type="submit"
      className="rounded-l-none focus-visible:ring-0 focus-visible:ring-offset-0"
      aria-label="Search"
    >
      <Search className="h-4 w-4" />
    </Button>
  </form>
);

export default SearchField;
