
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchTrainerProfile, updateTrainerName } from '../api/trainerApi';
import { fetchPokemonList } from '../api/pokemonApi';
import { 
  Box, 
  VStack, 
  HStack, 
  Heading, 
  Text, 
  Avatar, 
  Button, 
  Input, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Flex,
  Badge,
  Icon
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
    <VStack spacing={6} align="stretch">
      <Box 
        borderWidth={1} 
        borderRadius="lg" 
        p={6} 
        boxShadow="md" 
        bg="white"
      >
        <VStack spacing={4} align="stretch">
          <HStack spacing={6} alignItems="start">
            <Avatar 
              size="xl" 
              src="/placeholder.svg" 
              name={trainer.name} 
              borderWidth={2} 
              borderColor="red.500"
            />

            <VStack spacing={4} align="stretch" flex={1}>
              <Box>
                {isEditingName ? (
                  <HStack spacing={2}>
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
                      isLoading={updateNameMutation.isPending}
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
                  </HStack>
                ) : (
                  <HStack spacing={2} alignItems="center">
                    <Icon as={User} />
                    <Heading size="lg">{trainer.name}</Heading>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={handleStartEditName}
                    >
                      <Icon as={Edit} />
                    </Button>
                  </HStack>
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
                    <HStack>
                      <Icon as={stat.icon} color={stat.color} />
                      <Text fontWeight="semibold">{stat.value}</Text>
                    </HStack>
                  </Box>
                ))}
              </Flex>
            </VStack>
          </HStack>
        </VStack>
      </Box>

      <Tabs>
        <TabList>
          <Tab>Collection</Tab>
          <Tab>Pokémon Collections</Tab>
          <Tab>Items</Tab>
        </TabList>

        <TabPanels>
          <TabPanel>
            {trainer.collections && trainer.collections[0] && (
              <CollectionList 
                collectionId={trainer.collections[0].id}
                onSelectPokemon={handleSelectPokemon}
              />
            )}
          </TabPanel>
          <TabPanel>
            <PokemonCollections />
          </TabPanel>
          <TabPanel>
            <ItemInventory />
          </TabPanel>
        </TabPanels>
      </Tabs>
    </VStack>
  );
};

export default TrainerProfile;
