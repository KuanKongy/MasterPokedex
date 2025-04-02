
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRegions } from '../api/regionApi';
import PokemonMap from '../components/PokemonMap';
import { 
  Box, 
  Heading, 
  Text, 
  Image,
  Flex,
  Grid,
  GridItem,
  Badge,
  Icon
} from '@chakra-ui/react';
import { Compass } from 'lucide-react';

const Map = () => {
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  
  const { data: regions, isLoading } = useQuery({
    queryKey: ['regions'],
    queryFn: fetchRegions
  });

  // Set default region when data loads
  useEffect(() => {
    if (regions && regions.length > 0 && !selectedRegionId) {
      setSelectedRegionId(regions[0].id);
    }
  }, [regions, selectedRegionId]);

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    if (regions && regions[index]) {
      setSelectedRegionId(regions[index].id);
    }
  };

  return (
    <Box maxW="container.xl" mx="auto" px={4} py={8}>
      <Heading as="h1" size="xl" fontWeight="extrabold" mb={2}>Pokémon Map</Heading>
      <Text color="gray.500" mb={8}>
        Explore locations and discover which Pokémon can be found in different areas
      </Text>
      
      {isLoading ? (
        <Flex justify="center" p={8}>Loading region data...</Flex>
      ) : (
        <Box>
          <Box mb={6}>
            <Flex borderBottom="1px" borderColor="gray.200" mb={4} overflowX="auto">
              {regions?.map((region, idx) => (
                <Box 
                  key={region.id}
                  px={4} 
                  py={2} 
                  cursor="pointer"
                  borderBottom={activeTab === idx ? "2px solid" : "none"}
                  borderColor={activeTab === idx ? "blue.500" : "transparent"}
                  color={activeTab === idx ? "blue.500" : "gray.600"}
                  fontWeight={activeTab === idx ? "semibold" : "normal"}
                  onClick={() => handleTabChange(idx)}
                >
                  {region.name}
                </Box>
              ))}
            </Flex>
            
            <Box>
              {regions?.map((region, idx) => (
                <Box key={region.id} display={activeTab === idx ? "block" : "none"}>
                  <Box borderWidth="1px" borderRadius="md" mb={6} overflow="hidden">
                    <Box p={4}>
                      <Heading size="md">{region.name} Region</Heading>
                      <Text color="gray.500">{region.description}</Text>
                    </Box>
                    <Box p={4}>
                      <Grid templateColumns={{ md: "repeat(2, 1fr)" }} gap={8}>
                        <GridItem>
                          <Image 
                            src={region.mainImage} 
                            alt={`Map of ${region.name}`}
                            borderRadius="md"
                            boxShadow="md"
                            w="full"
                          />
                        </GridItem>
                        <GridItem>
                          <Heading as="h3" size="md" mb={2}>Notable Locations</Heading>
                          <Box>
                            {region.locations.map(location => (
                              <Box key={location.id} pb={3} mb={3} borderBottomWidth="1px">
                                <Text fontWeight="medium">{location.name}</Text>
                                <Text fontSize="sm" color="gray.500">{location.description}</Text>
                                {location.pokemonEncounters.length > 0 && (
                                  <Box mt={2}>
                                    <Text fontSize="xs" fontWeight="medium" mb={1}>Pokémon Encounters:</Text>
                                    <Flex flexWrap="wrap" gap={2}>
                                      {location.pokemonEncounters.map(encounter => (
                                        <Flex 
                                          key={encounter.pokemonId} 
                                          alignItems="center" 
                                          gap={1} 
                                          bg="gray.100" 
                                          px={2} 
                                          py={1} 
                                          borderRadius="md" 
                                          fontSize="xs"
                                        >
                                          <Image src={encounter.sprite} alt={encounter.name} w={4} h={4} />
                                          <Text>{encounter.name}</Text>
                                        </Flex>
                                      ))}
                                    </Flex>
                                  </Box>
                                )}
                              </Box>
                            ))}
                          </Box>
                        </GridItem>
                      </Grid>
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
          
          <PokemonMap regionId={selectedRegionId || 1} />
        </Box>
      )}
    </Box>
  );
};

export default Map;
