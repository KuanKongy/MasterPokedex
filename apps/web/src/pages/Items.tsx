import React from 'react';
import { useSearchParams } from 'react-router-dom';
import ItemCatalogue, { ITEM_VIEWS } from '../components/ItemCatalogue';
import SegmentedToggle from '../components/SegmentedToggle';

/**
 * The item catalogue, pure reference data and open to everyone. Your bag
 * lives on the trainer page (its Bag tab; the header's "My bag" lands there),
 * so this page has exactly one job: every item the dex knows. The view
 * switch rides the title row, like the Pokédex's, over the same URL state
 * the catalogue reads.
 */
const Items: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'table' ? 'table' : 'cards';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Items</h1>
          <p className="text-muted-foreground">Catalogue of every item known to the dex</p>
        </div>
        <SegmentedToggle
          options={ITEM_VIEWS}
          value={view}
          onChange={(next) =>
            setParams(
              (prev) => {
                const nextParams = new URLSearchParams(prev);
                if (next === 'cards') nextParams.delete('view');
                else nextParams.set('view', next);
                return nextParams;
              },
              { replace: true },
            )
          }
          ariaLabel="Item list style"
        />
      </div>
      <ItemCatalogue />
    </div>
  );
};

export default Items;
