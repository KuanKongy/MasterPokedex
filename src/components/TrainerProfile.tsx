
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrainerProfile, updateTrainerName } from '../api/trainerApi';
import { fetchPokemonList } from '../api/pokemonApi';
import { 
  Box, 
  Flex, 
  Heading, 
  Text, 
  Button, 
  Input,
  Icon,
  Stack,
  Avatar,
  AvatarBadge,
} from '@chakra-ui/react';
import { User, Medal, Calendar, Edit, Check, X } from 'lucide-react';
import CollectionList from './CollectionList';
import ItemInventory from './ItemInventory';
import PokemonCollections from './PokemonCollections';
import { useToast } from '@/hooks/use-toast';

const TrainerProfile: React.FC = () => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedPokemonId, setSelectedPokemonId] = useState<number | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: trainer, isLoading: trainerLoading } = useQuery({
    queryKey: ['trainerProfile'],
    queryFn: fetchTrainerProfile
  });

  const { data: allPokemon, isLoading: pokemonLoading } = useQuery({
    queryKey: ['pokemonList'],
    queryFn: fetchPokemonList
  });
  
  const updateNameMutation = useMutation({
    mutationFn: updateTrainerName,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trainerProfile'] });
      setIsEditingName(false);
      toast({
        title: "Name updated",
        description: "Your trainer name has been successfully updated.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update trainer name. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleStartEditName = () => {
    if (trainer) {
      setNewName(trainer.name);
      setIsEditingName(true);
    }
  };

  const handleSaveName = () => {
    if (newName.trim()) {
      updateNameMutation.mutate(newName);
    }
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
  };

  const handleSelectPokemon = (pokemonId: number) => {
    setSelectedPokemonId(pokemonId);
    toast({
      title: "Pokémon Selected",
      description: `You selected Pokémon #${pokemonId}`,
    });
  };

  if (trainerLoading || pokemonLoading) {
    return <Box display="flex" justifyContent="center" p={8}>Loading trainer data...</Box>;
  }

  if (!trainer) {
    return <Box color="red.500" p={4}>Error loading trainer profile</Box>;
  }

  return (
    <Stack direction="column" gap={6} align="stretch">
      <Box 
        borderWidth={1} 
        borderRadius="lg" 
        p={6} 
        boxShadow="md" 
        bg="white"
      >
        <Stack direction="column" gap={4} align="stretch">
          <Flex gap={6} alignItems="flex-start">
            <Avatar 
              size="xl" 
              src="/placeholder.svg" 
              name={trainer.name} 
            >
              <AvatarBadge boxSize="1.25em" bg="red.500" />
            </Avatar>

            <Stack direction="column" gap={4} align="stretch" flex={1}>
              <Box>
                {isEditingName ? (
                  <Flex gap={2}>
                    <Input 
                      value={newName} 
                      onChange={(e) => setNewName(e.target.value)}
                      maxW="xs"
                      placeholder="Enter new name"
                    />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleSaveName}
                      isDisabled={updateNameMutation.isPending}
                    >
                      <Icon as={Check} />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={handleCancelEdit}
                    >
                      <Icon as={X} />
                    </Button>
                  </Flex>
                ) : (
                  <Flex gap={2} alignItems="center">
                    <Icon as={User} />
                    <Heading size="lg">{trainer.name}</Heading>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleStartEditName}
                    >
                      <Icon as={Edit} />
                    </Button>
                  </Flex>
                )}
                <Text color="gray.500">{trainer.region} Region</Text>
              </Box>

              <Flex wrap="wrap" gap={4}>
                {[
                  { 
                    icon: Medal, 
                    color: "yellow.500", 
                    label: "Badges", 
                    value: trainer.badges 
                  },
                  { 
                    icon: User, 
                    color: "green.500", 
                    label: "Pokémon Caught", 
                    value: trainer.pokemonCaught 
                  },
                  { 
                    icon: Calendar, 
                    color: "blue.500", 
                    label: "Favorite Type", 
                    value: trainer.favoriteType 
                  },
                  { 
                    icon: Calendar, 
                    color: "purple.500", 
                    label: "Joined", 
                    value: new Date(trainer.joinDate).toLocaleDateString() 
                  }
                ].map((stat, index) => (
                  <Box 
                    key={index} 
                    bg="gray.100" 
                    p={3} 
                    borderRadius="md"
                    flex="1 1 0"
                  >
                    <Text color="gray.500" fontSize="sm">{stat.label}</Text>
                    <Flex>
                      <Icon as={stat.icon} color={stat.color} />
                      <Text fontWeight="semibold" ml={1}>{stat.value}</Text>
                    </Flex>
                  </Box>
                ))}
              </Flex>
            </Stack>
          </Flex>
        </Stack>
      </Box>

      <Box>
        {/* Custom tabs implementation instead of ChakraUI Tabs */}
        <Box>
          <Box borderWidth="1px" p={2} borderRadius="md" mb={2}>
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
                Collection
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
                Pokémon Collections
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
                Items
              </Box>
            </Flex>
          </Box>

          <Box p={0}>
            {tabIndex === 0 && trainer.collections && trainer.collections[0] && (
              <CollectionList 
                collectionId={trainer.collections[0].id}
                onSelectPokemon={handleSelectPokemon}
              />
            )}
            
            {tabIndex === 1 && (
              <PokemonCollections />
            )}
            
            {tabIndex === 2 && (
              <ItemInventory />
            )}
          </Box>
        </Box>
      </Box>
    </Stack>
  );
};

export default TrainerProfile;
