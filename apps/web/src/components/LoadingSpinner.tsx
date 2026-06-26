import React from 'react';
import { ballSprite, useBallPref } from '@/prefs/BallPrefContext';

/**
 * The app-wide loading state: the user's chosen Poké Ball, rocking like one
 * that is about to click shut. The sprite comes from the same PokeAPI item
 * set the bag uses; if it ever 404s the CSS fallback ball takes over.
 */
const LoadingSpinner: React.FC = () => {
  const { ballStyle } = useBallPref();
  const [broken, setBroken] = React.useState(false);

  return (
    <div className="flex items-center justify-center w-full py-12" role="status" aria-label="Loading">
      {broken ? (
        <div className="relative h-12 w-12 animate-pokeball-shake">
          <div className="absolute inset-0 rounded-full border-4 border-pokebrand-red border-b-white bg-white" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-pokebrand-black" />
        </div>
      ) : (
        <img
          src={ballSprite(ballStyle)}
          alt=""
          className="h-12 w-12 pixelated animate-pokeball-shake"
          onError={() => setBroken(true)}
        />
      )}
    </div>
  );
};

export default LoadingSpinner;
