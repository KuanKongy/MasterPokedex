
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchLocations } from '../api/locationApi';
import LocationDetails from './LocationDetails';
import { Location } from '../types/location';
import { 
  Grid, 
  GridItem, 
  Box,
  Heading, 
  Text,
  Flex,
  Icon
} from '@chakra-ui/react';
import { MapPin, Compass } from 'lucide-react';

interface PokemonMapProps {
  regionId?: number;
  selectedLocation?: number | null;
  onLocationSelect?: (locationId: number) => void;
}

const PokemonMap: React.FC<PokemonMapProps> = ({ 
  regionId, 
  selectedLocation: externalSelectedLocation, 
  onLocationSelect 
}) => {
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  
  // Use external state if provided
  const activeLocation = externalSelectedLocation !== undefined 
    ? externalSelectedLocation 
    : selectedLocation;
  
  const { data: locations, isLoading, error } = useQuery({
    queryKey: ['locations'],
    queryFn: fetchLocations
  });
  
  // Filter locations by region
  const regionLocations = locations?.filter(location => {
    if (!regionId) return location.region === "Kanto"; // Default to Kanto
    
    const regionNames: Record<number, string> = {
      1: "Kanto",
      2: "Johto",
      3: "Hoenn"
    };
    
    return location.region === regionNames[regionId];
  });
  
  // Handle location selection
  const handleLocationClick = (locationId: number) => {
    if (onLocationSelect) {
      onLocationSelect(locationId);
    } else {
      setSelectedLocation(locationId);
    }
  };
  
  // Reset selected location when region changes
  useEffect(() => {
    setSelectedLocation(null);
  }, [regionId]);
  
  if (isLoading) {
    return <Flex alignItems="center" justifyContent="center" h="64px"><Text>Loading map data...</Text></Flex>;
  }
  
  if (error) {
    return <Box color="red.500" p={4}>Error loading map data</Box>;
  }
  
  // Get current region name
  const regionName = regionId ? 
    (regionId === 1 ? "Kanto" : regionId === 2 ? "Johto" : regionId === 3 ? "Hoenn" : "Unknown") : 
    "Kanto";
  
  return (
    <Grid templateColumns={{ base: "1fr", lg: "1fr 2fr" }} gap={6}>
      <GridItem>
        <Box shadow="md" borderRadius="md" borderWidth="1px" bg="white" h="full">
          <Box p={4} borderBottomWidth="1px">
            <Flex alignItems="center" gap={2}>
              <Icon as={MapPin} color="red.500" boxSize={5} />
              <Heading size="md">{regionName} Locations</Heading>
            </Flex>
            <Text color="gray.500" fontSize="sm">
              Select a location to see which Pokémon can be found there
            </Text>
          </Box>
          <Box p={0}>
            <Box maxH="calc(100vh - 300px)" overflowY="auto">
              <Box>
                {regionLocations?.length ? (
                  regionLocations.map((location) => (
                    <Box 
                      key={location.id}
                      p={3}
                      bg={activeLocation === location.id ? 'gray.100' : undefined}
                      _hover={{ bg: 'gray.50' }}
                      cursor="pointer"
                      transition="background-color 0.2s"
                      onClick={() => handleLocationClick(location.id)}
                      borderBottomWidth="1px"
                    >
                      <Text fontWeight="medium">{location.name}</Text>
                      <Flex alignItems="center" gap={1} color="gray.500" fontSize="sm">
                        <Icon as={Compass} boxSize={3} /> {location.region}
                      </Flex>
                    </Box>
                  ))
                ) : (
                  <Box p={3} textAlign="center" color="gray.500">
                    No locations found for this region
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </GridItem>

      <GridItem>
        {activeLocation && regionLocations ? (
          <LocationDetails location={regionLocations.find(loc => loc.id === activeLocation)} />
        ) : (
          <Box h="full" display="flex" flexDirection="column" alignItems="center" justifyContent="center" p={6} textAlign="center" shadow="md" borderWidth="1px" borderRadius="md" bg="white">
            <Icon as={MapPin} boxSize={12} color="gray.300" mb={4} />
            <Heading as="h3" size="md" mb={2}>Select a Location</Heading>
            <Text color="gray.500">
              Click on a location from the list to view detailed information and Pokémon encounters
            </Text>
          </Box>
        )}
      </GridItem>
    </Grid>
  );
};

export default PokemonMap;
