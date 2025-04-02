
import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchRegions } from '../api/regionApi';
import PokemonMap from '../components/PokemonMap';
import { 
  Box, 
  Heading, 
  Text, 
  Card, 
  CardHeader, 
  CardBody, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Grid,
  GridItem,
  Image,
  List,
  ListItem,
  Flex,
  Badge,
  Avatar
} from '@chakra-ui/react';

const Map = () => {
  const [selectedRegionId, setSelectedRegionId] = useState<number | null>(null);
  
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
          <Tabs 
            defaultValue={regions?.[0]?.id.toString()} 
            onChange={(idx) => setSelectedRegionId(Number(idx)+1)}
            mb={6}
          >
            <TabList mb={4} overflowX="auto" display="flex">
              {regions?.map((region, idx) => (
                <Tab key={region.id}>{region.name}</Tab>
              ))}
            </TabList>
            
            <TabPanels>
              {regions?.map(region => (
                <TabPanel key={region.id} p={0}>
                  <Card variant="outline" mb={6}>
                    <CardHeader>
                      <Heading size="md">{region.name} Region</Heading>
                      <Text color="gray.500">{region.description}</Text>
                    </CardHeader>
                    <CardBody>
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
                          <List spacing={4}>
                            {region.locations.map(location => (
                              <ListItem key={location.id} pb={3} borderBottomWidth="1px">
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
                              </ListItem>
                            ))}
                          </List>
                        </GridItem>
                      </Grid>
                    </CardBody>
                  </Card>
                </TabPanel>
              ))}
            </TabPanels>
          </Tabs>
          
          <PokemonMap regionId={selectedRegionId || 1} />
        </Box>
      )}
    </Box>
  );
};

export default Map;
