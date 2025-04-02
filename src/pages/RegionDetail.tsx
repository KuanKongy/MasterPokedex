
import React, { useState } from 'react';
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
  Icon,
  Badge, 
  SimpleGrid,
} from '@chakra-ui/react';
import { MapPin, Cloud, Route, ArrowLeft } from 'lucide-react';

const RegionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const regionId = id ? parseInt(id) : 1;
  const [tabIndex, setTabIndex] = useState(0);
  
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
        <Box 
          as={Link} 
          to="/regions" 
          color="blue.500" 
          _hover={{ textDecoration: "underline" }}
        >
          Return to regions list
        </Box>
      </Box>
    );
  }
  
  return (
    <Box maxW="container.xl" mx="auto" px={4} py={8}>
      <Box 
        as={Link} 
        to="/regions" 
        display="flex"
        alignItems="center" 
        color="gray.500" 
        _hover={{ color: "gray.800" }}
        mb={6}
      >
        <Icon as={ArrowLeft} boxSize={4} mr={1} /> Back to Regions
      </Box>
      
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
      
      {/* Custom tabs implementation */}
      <Box>
        <Box mb={4} borderWidth="1px" p={2} borderRadius="md">
          <Flex>
            <Box 
              flex="1" 
              textAlign="center" 
              py={2} 
              cursor="pointer" 
              borderRadius="md" 
              bg={tabIndex === 0 ? "gray.100" : "transparent"}
              _hover={{ bg: "gray.100" }}
              onClick={() => setTabIndex(0)}
            >
              Locations
            </Box>
            <Box 
              flex="1" 
              textAlign="center" 
              py={2} 
              cursor="pointer" 
              borderRadius="md" 
              bg={tabIndex === 1 ? "gray.100" : "transparent"}
              _hover={{ bg: "gray.100" }}
              onClick={() => setTabIndex(1)}
            >
              Routes
            </Box>
            <Box 
              flex="1" 
              textAlign="center" 
              py={2} 
              cursor="pointer" 
              borderRadius="md" 
              bg={tabIndex === 2 ? "gray.100" : "transparent"}
              _hover={{ bg: "gray.100" }}
              onClick={() => setTabIndex(2)}
            >
              Interactive Map
            </Box>
          </Flex>
        </Box>

        <Box mb={8}>
          {tabIndex === 0 && (
            <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} gap={4}>
              {region.locations.map(location => (
                <Box key={location.id} variant="outline" borderWidth="1px" borderRadius="md">
                  <Box p={4} pb={2}>
                    <Flex justifyContent="space-between" alignItems="start">
                      <Heading size="sm">{location.name}</Heading>
                      <Badge variant="outline" fontSize="xs">
                        {location.pokemonEncounters.length > 0 ? `${location.pokemonEncounters.length} Pokémon` : 'No encounters'}
                      </Badge>
                    </Flex>
                  </Box>
                  <Box p={4} pt={0}>
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
                  </Box>
                </Box>
              ))}
            </SimpleGrid>
          )}
          
          {tabIndex === 1 && (
            <Grid templateColumns={{ base: "1fr", md: "1fr 1fr" }} gap={6} mb={4}>
              <Box borderWidth="1px" borderRadius="md">
                <Box p={4} pb={2}>
                  <Flex alignItems="center" gap={2}>
                    <Icon as={Route} boxSize={5} /> 
                    <Heading size="md">{region.name} Routes</Heading>
                  </Flex>
                </Box>
                <Box p={4}>
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
                </Box>
              </Box>
              
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
          )}
          
          {tabIndex === 2 && (
            <PokemonMap regionId={regionId} />
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default RegionDetail;
