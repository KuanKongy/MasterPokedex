
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Box, 
  Flex,
  Heading, 
  Text, 
  Image,
  Button,
} from '@chakra-ui/react';
import { fetchLocations, fetchLocationById } from '../api/locationApi';
import PokemonMap from '../components/PokemonMap';
import { Card, CardContent, CardHeader, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MapPin, Pokemon } from 'lucide-react';

const Map: React.FC = () => {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  
  const { data: locations = [] } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations
  });
  
  const { data: locationDetails } = useQuery({
    queryKey: ['location', selectedLocation],
    queryFn: () => selectedLocation ? fetchLocationById(selectedLocation) : null,
    enabled: !!selectedLocation
  });
  
  const handleLocationSelect = (locationId: string) => {
    setSelectedLocation(locationId);
  };
  
  const clearSelection = () => {
    setSelectedLocation(null);
  };
  
  return (
    <Box className="container mx-auto px-4 py-8">
      <Heading as="h1" size="2xl" mb={2}>Pokémon World Map</Heading>
      <Text color="gray.600" mb={8}>
        Explore regions and locations throughout the Pokémon world
      </Text>
      
      <Tabs defaultValue="map">
        <TabsList>
          <TabsTrigger value="map">Interactive Map</TabsTrigger>
          <TabsTrigger value="list">Locations List</TabsTrigger>
        </TabsList>
        
        <TabsContent value="map">
          <Box 
            height="600px" 
            position="relative"
            borderRadius="lg"
            overflow="hidden"
            borderWidth="1px"
            mb={4}
          >
            <PokemonMap 
              locations={locations} 
              selectedLocation={selectedLocation}
              onLocationSelect={handleLocationSelect}
            />
            
            {selectedLocation && locationDetails && (
              <Box 
                position="absolute" 
                bottom={4} 
                right={4} 
                width={{ base: 'calc(100% - 2rem)', md: '350px' }}
                zIndex={10}
              >
                <Card>
                  <CardHeader>
                    <Flex justify="space-between" align="center">
                      <Heading size="md">{locationDetails.name}</Heading>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={clearSelection}
                      >
                        ×
                      </Button>
                    </Flex>
                  </CardHeader>
                  <CardContent>
                    <Text mb={2}>{locationDetails.description}</Text>
                    <Flex wrap="wrap" gap={2} mt={3}>
                      <Badge>{locationDetails.region}</Badge>
                      <Badge variant="outline">{locationDetails.type}</Badge>
                    </Flex>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Box>
        </TabsContent>
        
        <TabsContent value="list">
          <Box 
            display="grid"
            gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
            gap={4}
          >
            {locations.map((location) => (
              <Card key={location.id} cursor="pointer" onClick={() => handleLocationSelect(location.id)}>
                <CardContent className="p-4">
                  <Flex align="center" mb={2}>
                    <MapPin size={16} className="mr-2" />
                    <Heading size="md">{location.name}</Heading>
                  </Flex>
                  <Text fontSize="sm" color="gray.600">{location.region}</Text>
                  
                  <Flex mt={3} gap={2}>
                    <Badge variant="outline">{location.type}</Badge>
                    {location.hasPokemonCenter && (
                      <Badge colorScheme="red">Pokémon Center</Badge>
                    )}
                  </Flex>
                </CardContent>
              </Card>
            ))}
          </Box>
        </TabsContent>
      </Tabs>
    </Box>
  );
};

export default Map;
