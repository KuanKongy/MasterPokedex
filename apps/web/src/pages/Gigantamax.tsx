import React from 'react';
import { useGmax } from '@/hooks/api/dex';
import FormGallery from '@/components/pokemon/FormGallery';

/**
 * The Gigantamax lineup. The data was always in the dex — `is_gmax` has been
 * on `dex.pokemon` since the forms migration — but a badge inside a collapsed
 * section on one detail page was the only place it surfaced.
 */
const Gigantamax: React.FC = () => {
  const { data, isLoading } = useGmax();
  return (
    <FormGallery
      title="Gigantamax"
      blurb={(count) =>
        count > 0
          ? `${count} species with a Gigantamax form, reached with a Dynamax Band and the Gigantamax Factor`
          : 'Species with a Gigantamax form'
      }
      help="Galar's phenomenon: a Dynamax Band makes a Pokémon colossal for three turns, and one carrying the Gigantamax Factor takes this changed shape instead."
      forms={data?.items ?? []}
      isLoading={isLoading}
    />
  );
};

export default Gigantamax;
