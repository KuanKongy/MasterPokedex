
import React from 'react';
import TrainerProfile from '../components/TrainerProfile';

const Trainer = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Trainer Profile</h1>
      <p className="text-muted-foreground mb-8">
        Manage your collection and items
      </p>
      
      <TrainerProfile />
    </div>
  );
};

export default Trainer;
