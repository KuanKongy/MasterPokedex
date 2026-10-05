import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"

import { cn } from "@/lib/utils"

const Tabs = TabsPrimitive.Root

/**
 * The strip scrolls instead of widening the page.
 *
 * Triggers are `whitespace-nowrap` by design, so a six-tab set (the advanced
 * search entity picker) is wider than a phone. Left alone the list pushed the
 * document sideways and every page scrolled with it. The list is therefore its
 * own scroll container, with a fade on whichever side still has tabs behind it
 * — the scrollbar is hidden, so the fade is the only thing saying "there's
 * more". A list that fits shows neither.
 */
const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [edges, setEdges] = React.useState({ start: false, end: false })

  const setRefs = React.useCallback(
    (node: HTMLDivElement | null) => {
      listRef.current = node
      if (typeof ref === "function") ref(node)
      else if (ref) (ref as React.MutableRefObject<HTMLDivElement | null>).current = node
    },
    [ref],
  )

  const measure = React.useCallback(() => {
    const el = listRef.current
    if (!el) return
    const hidden = el.scrollWidth - el.clientWidth
    // Sub-pixel widths make an exact comparison flicker the fades on and off.
    setEdges({ start: el.scrollLeft > 1, end: hidden - el.scrollLeft > 1 })
  }, [])

  React.useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return

    // A strip can open on a tab that starts out past the right edge (the
    // entity picker restores its entity from the URL); bring it into view.
    const active = el.querySelector<HTMLElement>('[data-state="active"]')
    if (active) {
      const overshoot = active.offsetLeft + active.offsetWidth - el.clientWidth
      if (overshoot > 0) el.scrollLeft = overshoot + 4
    }
    measure()

    const resize = new ResizeObserver(measure)
    resize.observe(el)
    // Tab sets built from data (a trainer's teams, a region list) change after
    // mount without the list itself resizing.
    const mutate = new MutationObserver(measure)
    mutate.observe(el, { childList: true, subtree: true })
    return () => {
      resize.disconnect()
      mutate.disconnect()
    }
  }, [measure])

  return (
    <div className="relative min-w-0 max-w-full">
      <TabsPrimitive.List
        ref={setRefs}
        onScroll={measure}
        className={cn(
          "no-scrollbar inline-flex h-10 max-w-full items-center justify-start overflow-x-auto overscroll-x-contain rounded-md bg-muted p-1 text-muted-foreground",
          className
        )}
        {...props}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 w-6 rounded-l-md bg-gradient-to-r from-muted to-transparent transition-opacity",
          edges.start ? "opacity-100" : "opacity-0",
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 w-6 rounded-r-md bg-gradient-to-l from-muted to-transparent transition-opacity",
          edges.end ? "opacity-100" : "opacity-0",
        )}
      />
    </div>
  )
})
TabsList.displayName = TabsPrimitive.List.displayName

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm",
      className
    )}
    {...props}
  />
))
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn(
      "mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
      className
    )}
    {...props}
  />
))
TabsContent.displayName = TabsPrimitive.Content.displayName

export { Tabs, TabsList, TabsTrigger, TabsContent }
