import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { CircleHelp } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type TipProps = {
  title?: string;
  /** FAQ item slug; adds a "More in the FAQ →" link to /faq#<slug>. */
  faq?: string;
  className?: string;
  children: React.ReactNode;
};

const OPEN_DELAY = 200;
const CLOSE_GRACE = 150;

/**
 * The site's explainers, one Popover doing both jobs: it opens on hover after
 * a beat (with a grace period so the pointer can travel into the content and
 * reach the FAQ link) and toggles on click, which is all a touch screen
 * sends. A plain Tooltip can't do this: it never opens on tap and closes
 * before a link inside is clickable.
 *
 * Two faces share the machinery. HelpTip is the small ? beside a term, for
 * headings and labels where nothing on screen suggests hovering. HoverTip
 * wraps the element itself (a pill, a badge, a dex number) so the thing you
 * are curious about is the trigger and no ? breaks the layout.
 *
 * Both triggers prevent default and stop propagation, because tips sit
 * inside links, labels and sort headers; opening a tip must never follow the
 * link under it.
 */
function useTipState() {
  const [open, setOpen] = useState(false);
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const schedule = (next: boolean) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOpen(next), next ? OPEN_DELAY : CLOSE_GRACE);
  };
  const hold = () => window.clearTimeout(timer.current);
  return { open, setOpen, schedule, hold };
}

const TipContent: React.FC<Pick<TipProps, 'title' | 'faq' | 'children'> & { hold: () => void; scheduleClose: () => void }> = ({
  title,
  faq,
  children,
  hold,
  scheduleClose,
}) => (
  <PopoverContent
    className="w-auto max-w-xs p-3 text-sm font-normal normal-case tracking-normal"
    onMouseEnter={hold}
    onMouseLeave={scheduleClose}
    onClick={(e) => e.stopPropagation()}
  >
    {title && <p className="mb-1 font-medium">{title}</p>}
    <div className="text-muted-foreground">{children}</div>
    {faq && (
      <Link to={`/faq#${faq}`} className="mt-2 inline-block text-xs font-medium underline">
        More in the FAQ →
      </Link>
    )}
  </PopoverContent>
);

const HelpTip: React.FC<TipProps> = ({ title, faq, className, children }) => {
  const { open, setOpen, schedule, hold } = useTipState();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={title ?? 'What is this?'}
          className={cn(
            'inline-flex align-text-top text-muted-foreground transition-colors hover:text-foreground',
            className,
          )}
          onClick={(e) => {
            // preventDefault also skips Radix's own toggle, so this stays the
            // single owner of click behaviour.
            e.preventDefault();
            e.stopPropagation();
            hold();
            setOpen((current) => !current);
          }}
          onMouseEnter={() => schedule(true)}
          onMouseLeave={() => schedule(false)}
        >
          <CircleHelp className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <TipContent title={title} faq={faq} hold={hold} scheduleClose={() => schedule(false)}>
        {children}
      </TipContent>
    </Popover>
  );
};

type HoverTipProps = TipProps & {
  /** What the tip explains; rendered as the trigger itself. */
  trigger: React.ReactNode;
};

export const HoverTip: React.FC<HoverTipProps> = ({ trigger, title, faq, className, children }) => {
  const { open, setOpen, schedule, hold } = useTipState();
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <span
          role="button"
          tabIndex={0}
          className={cn('inline-flex cursor-help items-center', className)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            hold();
            setOpen((current) => !current);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              setOpen((current) => !current);
            }
          }}
          onMouseEnter={() => schedule(true)}
          onMouseLeave={() => schedule(false)}
        >
          {trigger}
        </span>
      </PopoverTrigger>
      <TipContent title={title} faq={faq} hold={hold} scheduleClose={() => schedule(false)}>
        {children}
      </TipContent>
    </Popover>
  );
};

export default HelpTip;
