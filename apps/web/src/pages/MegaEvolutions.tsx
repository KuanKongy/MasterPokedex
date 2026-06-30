import React from 'react';
import { useMegas } from '@/hooks/api/dex';
import FormGallery from '@/components/pokemon/FormGallery';

/**
 * Every Mega Evolution in one gallery — labeled forms from the dex, each
 * linked to its own detail page and back to its base species.
 */
const MegaEvolutions: React.FC = () => {
  const { data, isLoading } = useMegas();
  return (
    <FormGallery
      title="Mega Evolutions"
      blurb={(count) =>
        count > 0 ? `${count} Mega forms unlocked by Mega Stones` : 'Temporary battle forms unlocked by Mega Stones'
      }
      help="A temporary transformation in battle: a bonded trainer's Key Stone plus the species' held Mega Stone push it beyond its final stage until the battle ends."
      forms={data?.items ?? []}
      isLoading={isLoading}
    />
  );
};

export default MegaEvolutions;
