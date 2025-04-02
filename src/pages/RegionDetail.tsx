
import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchRegionById } from '../api/regionApi';
import PokemonMap from '@/components/PokemonMap';
import { 
  Box, 
  Heading, 
  Text, 
  Flex, 
  Grid, 
  GridItem, 
  Image, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel, 
  Card, 
  CardHeader, 
  CardBody, 
  Badge, 
  SimpleGrid,
  Icon,
  Link as ChakraLink
} from '@chakra-ui/react';
import { MapPin, Cloud, Route, ArrowLeft } from 'lucide-react';

const RegionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const regionId = id ? parseInt(id) : 1;
  
  const { data: region, isLoading, error } = useQuery({
    queryKey: ['region', regionId],
    queryFn: () => fetchRegionById(regionId)
  });
  
  if (isLoading) {
    return <Box maxW="container.xl" mx="auto" px={4} py={8} textAlign="center">Loading region details...</Box>;
  }
  
  if (error || !region) {
    return (
      <Box maxW="container.xl" mx="auto" px={4} py={8} textAlign="center">
        <Heading as="h2" size="lg" mb={4}>Region not found</Heading>
        <Text color="gray.500" mb={4}>We couldn't find the region you're looking for.</Text>
        <ChakraLink as={Link} to="/regions" color="blue.500" _hover={{ textDecoration: "underline" }}>
          Return to regions list
        </ChakraLink>
      </Box>
    );
  }
  
  return (
    <Box maxW="container.xl" mx="auto" px={4} py={8}>
      <Flex 
        as={Link} 
        to="/regions" 
        alignItems="center" 
        color="gray.500" 
        _hover={{ color: "gray.800" }}
        mb={6}
      >
        <Icon as={ArrowLeft} boxSize={4} mr={1} /> Back to Regions
      </Flex>
      
      <Flex flexDir={{ base: "column", md: "row" }} gap={6} mb={8}>
        <Box width={{ base: "100%", md: "33%" }}>
          <Image 
            src={region.mainImage} 
            alt={`${region.name} region map`}
            borderRadius="lg" 
            shadow="md"
            width="100%" 
          />
        </Box>
        
        <Box width={{ base: "100%", md: "67%" }}>
          <Heading as="h1" size="xl" fontWeight="extrabold" mb={2}>{region.name} Region</Heading>
          <Text color="gray.500" mb={6}>{region.description}</Text>
          
          <SimpleGrid columns={{ base: 1, sm: 3 }} gap={4} mb={6}>
            <Box bg="white" border="1px" borderColor="gray.200" p={3} borderRadius="md" textAlign="center">
              <Text fontSize="sm" color="gray.500">Locations</Text>
              <Flex justifyContent="center" alignItems="center">
                <Text fontSize="xl" fontWeight="bold">{region.locations.length}</Text>
              </Flex>
            </Box>
            
            <Box bg="white" border="1px" borderColor="gray.200" p={3} borderRadius="md" textAlign="center">
              <Text fontSize="sm" color="gray.500">Routes</Text>
              <Flex justifyContent="center" alignItems="center">
                <Text fontSize="xl" fontWeight="bold">{Math.floor(region.locations.length / 2)}</Text>
              </Flex>
            </Box>
            
            <Box bg="white" border="1px" borderColor="gray.200" p={3} borderRadius="md" textAlign="center">
              <Text fontSize="sm" color="gray.500">Cities/Towns</Text>
              <Flex justifyContent="center" alignItems="center">
                <Text fontSize="xl" fontWeight="bold">{Math.ceil(region.locations.length / 2)}</Text>
              </Flex>
            </Box>
          </SimpleGrid>
          
          <Heading as="h2" size="md" mb={3}>About This Region</Heading>
          <Text color="gray.500">
            {region.name} is a vibrant region with diverse ecosystems and Pokémon habitats.
            Trainers from all over the world come to {region.name} to catch unique Pokémon and 
            challenge the region's Gym Leaders.
          </Text>
        </Box>
      </Flex>
      
      <Tabs variant="enclosed" mb={8}>
        <TabList mb={4}>
          <Tab>Locations</Tab>
          <Tab>Routes</Tab>
          <Tab>Interactive Map</Tab>
        </TabList>
        
        <TabPanels>
          <TabPanel px={0}>
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
              {region.locations.map(location => (
                <Card key={location.id} variant="outline">
                  <CardHeader pb={2}>
                    <Flex justifyContent="space-between" alignItems="start">
                      <Heading size="sm">{location.name}</Heading>
                      <Badge variant="outline" fontSize="xs">
                        {location.pokemonEncounters.length > 0 ? `${location.pokemonEncounters.length} Pokémon` : 'No encounters'}
                      </Badge>
                    </Flex>
                  </CardHeader>
                  <CardBody pt={0}>
                    <Text fontSize="sm" color="gray.500" mb={2}>{location.description}</Text>
                    
                    {location.weather.length > 0 && (
                      <Flex alignItems="center" gap={1} fontSize="xs" mt={3}>
                        <Icon as={Cloud} boxSize={3} />
                        <Text color="gray.500">Weather:</Text>
                        <Flex gap={1}>
                          {location.weather.map(w => (
                            <Badge key={w} variant="subtle" fontSize="xs" textTransform="capitalize">{w}</Badge>
                          ))}
                        </Flex>
                      </Flex>
                    )}
                    
                    {location.pokemonEncounters.length > 0 && (
                      <Box mt={3}>
                        <Text fontSize="xs" fontWeight="medium" mb={1}>Pokémon encounters:</Text>
                        <Flex flexWrap="wrap" gap={1}>
                          {location.pokemonEncounters.map(encounter => (
                            <Flex 
                              key={encounter.pokemonId} 
                              alignItems="center" 
                              gap={1} 
                              bg="gray.100" 
                              p={1} 
                              borderRadius="md"
                            >
                              <Image src={encounter.sprite} alt={encounter.name} boxSize="6" />
                              <Text fontSize="xs" textTransform="capitalize">{encounter.name}</Text>
                            </Flex>
                          ))}
                        </Flex>
                      </Box>
                    )}
                  </CardBody>
                </Card>
              ))}
            </SimpleGrid>
          </TabPanel>
          
          <TabPanel px={0}>
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mb={4}>
              <Card variant="outline">
                <CardHeader pb={2}>
                  <Flex alignItems="center" gap={2}>
                    <Icon as={Route} boxSize={5} /> 
                    <Heading size="md">{region.name} Routes</Heading>
                  </Flex>
                </CardHeader>
                <CardBody>
                  <Flex direction="column" gap={3}>
                    {region.locations.filter((_, i) => i % 2 === 1).map((location) => (
                      <Flex 
                        key={location.id} 
                        alignItems="center" 
                        gap={3} 
                        p={2} 
                        border="1px" 
                        borderColor="gray.200" 
                        borderRadius="md"
                      >
                        <Icon as={MapPin} boxSize={4} color="gray.400" />
                        <Box>
                          <Text fontWeight="medium">{`Route ${location.id}`}</Text>
                          <Text fontSize="xs" color="gray.500">Connects to {location.name}</Text>
                        </Box>
                      </Flex>
                    ))}
                  </Flex>
                </CardBody>
              </Card>
              
              <Flex 
                bg="gray.50" 
                borderRadius="lg" 
                p={6} 
                direction="column" 
                alignItems="center" 
                justifyContent="center" 
                textAlign="center"
              >
                <Icon as={Route} boxSize={12} color="gray.400" mb={4} />
                <Heading as="h3" size="md" mb={2}>Route Information</Heading>
                <Text color="gray.500">
                  Routes connect different locations within the {region.name} region. They are paths where
                  trainers can encounter wild Pokémon, battle other trainers, and discover new areas.
                </Text>
              </Flex>
            </Grid>
          </TabPanel>
          
          <TabPanel px={0}>
            <PokemonMap regionId={regionId} />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </Box>
  );
};

export default RegionDetail;
