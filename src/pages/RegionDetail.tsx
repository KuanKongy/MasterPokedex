
import React, { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchRegionById, fetchRegionPokemon, fetchRegionLocations } from '../api/regionApi';
import { 
  Box, 
  Flex,
  Heading, 
  Text, 
  Image,
  Link,
  Stack
} from '@chakra-ui/react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import PokemonCard from '../components/PokemonCard';
import LocationDetails from '../components/LocationDetails';
import { ChevronLeft, MapPin } from 'lucide-react';

const RegionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  
  const { data: region, isLoading: isLoadingRegion } = useQuery({
    queryKey: ['region', id],
    queryFn: () => fetchRegionById(id || '')
  });
  
  const { data: regionPokemon, isLoading: isLoadingPokemon } = useQuery({
    queryKey: ['regionPokemon', id],
    queryFn: () => fetchRegionPokemon(id || '')
  });
  
  const { data: locations, isLoading: isLoadingLocations } = useQuery({
    queryKey: ['regionLocations', id],
    queryFn: () => fetchRegionLocations(id || '')
  });
  
  if (isLoadingRegion) {
    return <Box p={8} textAlign="center">Loading region data...</Box>;
  }
  
  if (!region) {
    return (
      <Box p={8} textAlign="center">
        <Text>Region not found</Text>
        <Box mt={4}>
          <Link as={RouterLink} to="/regions" color="blue.500" _hover={{ textDecoration: 'underline' }}>
            Return to Regions List
          </Link>
        </Box>
      </Box>
    );
  }
  
  return (
    <Box maxW="1200px" mx="auto" p={4}>
      <Flex as={RouterLink} to="/regions" alignItems="center" color="blue.500" mb={4}>
        <ChevronLeft size={16} />
        <Text ml={1}>Back to Regions</Text>
      </Flex>
      
      <Box mb={8}>
        <Flex 
          direction={{ base: 'column', md: 'row' }} 
          align={{ base: 'center', md: 'flex-start' }}
          gap={6}
        >
          <Box 
            flex={{ base: '1', md: '0 0 280px' }} 
            position="relative"
            borderRadius="lg" 
            overflow="hidden"
            boxShadow="md"
          >
            <Image 
              src={region.image || '/placeholder.svg'} 
              alt={region.name} 
              objectFit="cover"
              w="full"
            />
          </Box>
          
          <Stack flex="1" spacing={4}>
            <Heading size="xl">{region.name}</Heading>
            
            <Stack spacing={2}>
              {[
                { label: 'Main City', value: region.mainCity },
                { label: 'Professor', value: region.professor },
                { label: 'Generation', value: region.generation },
                { label: 'Starter Pokémon', value: region.starters?.join(', ') }
              ].map((item, idx) => (
                <Flex key={idx}>
                  <Text fontWeight="bold" width="150px">{item.label}:</Text>
                  <Text>{item.value}</Text>
                </Flex>
              ))}
            </Stack>
            
            <Text>{region.description}</Text>
          </Stack>
        </Flex>
      </Box>
      
      <Tabs>
        <TabsList>
          <TabsTrigger value="pokemon">Regional Pokémon</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="gyms">Gyms & Leaders</TabsTrigger>
        </TabsList>
        
        <TabsContent value="pokemon">
          <Box p={2}>
            {isLoadingPokemon ? (
              <Box p={4} textAlign="center">Loading Pokémon...</Box>
            ) : (
              <Box>
                <Text mb={4}>These Pokémon can be found in the {region.name} region:</Text>
                
                <Box 
                  display="grid" 
                  gridTemplateColumns={{ 
                    base: 'repeat(1, 1fr)', 
                    sm: 'repeat(2, 1fr)', 
                    md: 'repeat(3, 1fr)',
                    lg: 'repeat(4, 1fr)'
                  }} 
                  gap={4}
                >
                  {regionPokemon?.pokemon.map((pokemon) => (
                    <Box 
                      key={pokemon.id} 
                      borderWidth="1px" 
                      borderRadius="md"
                    >
                      <PokemonCard pokemon={pokemon} />
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
          </TabsContent>
          
          <TabsContent value="locations">
            <Box p={2}>
              {isLoadingLocations ? (
                <Box p={4} textAlign="center">Loading locations...</Box>
              ) : (
                <Flex 
                  direction={{ base: 'column', md: 'row' }}
                  gap={4}
                >
                  <Box 
                    flex="0 0 300px" 
                    borderWidth="1px" 
                    borderRadius="md" 
                    overflowY="auto"
                    height={{ base: 'auto', md: '500px' }}
                  >
                    {locations?.map((location) => (
                      <Box 
                        key={location.id}
                        p={3}
                        cursor="pointer"
                        bg={selectedLocation === location.id ? 'gray.100' : 'transparent'}
                        _hover={{ bg: 'gray.50' }}
                        onClick={() => setSelectedLocation(location.id)}
                        borderBottomWidth="1px"
                        display="flex"
                        alignItems="center"
                      >
                        <MapPin size={16} />
                        <Text ml={2}>{location.name}</Text>
                      </Box>
                    ))}
                  </Box>
                  
                  <Box flex="1">
                    {selectedLocation ? (
                      <LocationDetails 
                        locationId={selectedLocation} 
                        regionId={region.id}
                      />
                    ) : (
                      <Box 
                        borderWidth="1px" 
                        borderRadius="md"
                        p={8}
                        textAlign="center"
                      >
                        <Text color="gray.500">Select a location to view details</Text>
                      </Box>
                    )}
                  </Box>
                </Flex>
              )}
            </TabsContent>
            
            <TabsContent value="gyms">
              <Box>
                <Text mb={4}>Gym Leaders and Elite Four members from the {region.name} region:</Text>
                
                {region.gymLeaders?.map((leader, idx) => (
                  <Card key={idx} className="mb-4">
                    <CardHeader>
                      <Heading size="md">{leader.name}</Heading>
                      <Text size="sm">
                        {leader.title} - {leader.type} Type
                      </Text>
                    </CardHeader>
                    <CardContent>
                      <Text>{leader.description}</Text>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            </TabsContent>
          </Tabs>
        </Box>
    );
};

export default RegionDetail;
