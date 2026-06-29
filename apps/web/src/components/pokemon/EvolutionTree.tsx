import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EvolutionTreeNode = {
  id: number;
  from: number | null;
  caption: string | null;
};

type Props<N extends EvolutionTreeNode> = {
  nodes: N[];
  renderCard: (node: N) => React.ReactNode;
  /** Smaller chevron and tighter captions, for the chains index. */
  dense?: boolean;
};

/**
 * Renders an evolution family as the tree it is, not a flattened row. A
 * node's children stack in a column to its right, each branch led by its own
 * arrow and condition — so Eevee is one card fanning out eight ways, and a
 * caption can never look like it turns one sibling into the next (the old
 * flat renderer put "use Thunder Stone" between Vaporeon and Jolteon).
 * Linear chains come out exactly as before: one row. Wide families scroll
 * horizontally rather than wrap into false sequences.
 */
function EvolutionTree<N extends EvolutionTreeNode>({ nodes, renderCard, dense }: Props<N>) {
  const ids = new Set(nodes.map((node) => node.id));
  const childrenOf = new Map<number, N[]>();
  const roots: N[] = [];
  for (const node of nodes) {
    // A parent outside the payload (or a self-loop) makes the node a root.
    if (node.from !== null && node.from !== node.id && ids.has(node.from)) {
      const siblings = childrenOf.get(node.from);
      if (siblings) siblings.push(node);
      else childrenOf.set(node.from, [node]);
    } else {
      roots.push(node);
    }
  }

  const renderSubtree = (node: N): React.ReactNode => {
    const children = childrenOf.get(node.id) ?? [];
    return (
      <div className="flex items-center">
        {renderCard(node)}
        {children.length > 0 && (
          <div className={cn('flex flex-col justify-center', dense ? 'gap-2' : 'gap-3')}>
            {children.map((child) => (
              <div key={child.id} className="flex items-center">
                <div className="px-2 text-center">
                  <ChevronRight
                    className={cn('mx-auto text-muted-foreground', dense ? 'h-5 w-5' : 'h-6 w-6')}
                  />
                  {child.caption && (
                    <div
                      className={cn(
                        'mt-1 text-xs text-muted-foreground',
                        dense ? 'max-w-24' : 'max-w-[110px]',
                      )}
                    >
                      {child.caption}
                    </div>
                  )}
                </div>
                {renderSubtree(child)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <div className={cn('mx-auto flex w-max flex-col', dense ? 'gap-2' : 'gap-4')}>
        {roots.map((root) => (
          <React.Fragment key={root.id}>{renderSubtree(root)}</React.Fragment>
        ))}
      </div>
    </div>
  );
}

export default EvolutionTree;
