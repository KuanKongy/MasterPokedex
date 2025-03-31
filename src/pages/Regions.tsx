
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRegions } from '../api/regionApi';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, ArrowRight } from 'lucide-react';

const Regions: React.FC = () => {
  const { data: regions, isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegions
  });
  
  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center">
        <div className="text-center">
          <p>Loading regions data...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Pokémon Regions</h1>
      <p className="text-muted-foreground mb-8">
        Explore the different regions of the Pokémon world and their unique locations
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {regions?.map((region) => (
          <Card key={region.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-48 overflow-hidden">
              <img 
                src={region.mainImage} 
                alt={`${region.name} region map`} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background/90 flex items-end p-4">
                <h2 className="text-2xl font-bold text-white">{region.name}</h2>
              </div>
            </div>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">{region.description}</p>
              <div className="flex flex-wrap gap-2 mb-4">
                <Badge variant="outline" className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {region.locations.length} locations
                </Badge>
              </div>
              <div className="space-y-2">
                <h3 className="text-sm font-medium">Notable locations:</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {region.locations.slice(0, 3).map(location => (
                    <li key={location.id} className="flex items-center">
                      <span className="w-1 h-1 rounded-full bg-primary mr-2"></span>
                      {location.name}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
            <CardFooter>
              <Link 
                to={`/regions/${region.id}`}
                className="text-sm text-primary hover:text-primary/80 font-medium inline-flex items-center"
              >
                Explore Region <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Regions;
