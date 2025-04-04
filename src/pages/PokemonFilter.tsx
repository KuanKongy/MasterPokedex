
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPokemonList } from '../api/pokemonApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { PlusCircle, MinusCircle, Search, Filter } from 'lucide-react';
import PokemonCard from '../components/PokemonCard';
import { Pokemon } from '../types/pokemon';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

type Condition = {
  id: string;
  field: string;
  operator: string;
  value: string;
  connector: 'AND' | 'OR' | null;
};

type ProjectionField = {
  name: string;
  selected: boolean;
  display: string;
};

const PokemonFilter: React.FC = () => {
  const [conditions, setConditions] = useState<Condition[]>([
    { id: '1', field: 'name', operator: 'contains', value: '', connector: null }
  ]);
  
  const [projectionFields, setProjectionFields] = useState<ProjectionField[]>([
    { name: 'id', selected: true, display: 'ID' },
    { name: 'name', selected: true, display: 'Name' },
    { name: 'types', selected: true, display: 'Types' },
    { name: 'height', selected: false, display: 'Height' },
    { name: 'weight', selected: false, display: 'Weight' },
    { name: 'abilities', selected: false, display: 'Abilities' },
    { name: 'stats', selected: false, display: 'Stats' }
  ]);
  
  const [filteredPokemon, setFilteredPokemon] = useState<Pokemon[]>([]);
  
  const { data: allPokemon, isLoading } = useQuery({
    queryKey: ['pokemonList'],
    queryFn: fetchPokemonList
  });
  
  const addCondition = () => {
    const lastCondition = conditions[conditions.length - 1];
    setConditions([
      ...conditions, 
      { 
        id: Date.now().toString(), 
        field: 'name', 
        operator: 'contains', 
        value: '', 
        connector: 'AND' 
      }
    ]);
  };
  
  const removeCondition = (id: string) => {
    // Don't remove if it's the only condition
    if (conditions.length <= 1) return;
    
    setConditions(conditions.filter(c => c.id !== id));
  };
  
  const updateCondition = (id: string, field: keyof Condition, value: any) => {
    setConditions(conditions.map(c => {
      if (c.id === id) {
        return { ...c, [field]: value };
      }
      return c;
    }));
  };
  
  const toggleProjectionField = (name: string) => {
    setProjectionFields(projectionFields.map(field => {
      if (field.name === name) {
        return { ...field, selected: !field.selected };
      }
      return field;
    }));
  };
  
  const applyFilter = () => {
    if (!allPokemon) return;
    
    let result = [...allPokemon];
    
    conditions.forEach((condition, index) => {
      let filterFn: (pokemon: Pokemon) => boolean;
      
      // Handle different field types and operators
      switch (condition.field) {
        case 'name':
          switch (condition.operator) {
            case 'contains':
              filterFn = (pokemon) => pokemon.name.toLowerCase().includes(condition.value.toLowerCase());
              break;
            case 'equals':
              filterFn = (pokemon) => pokemon.name.toLowerCase() === condition.value.toLowerCase();
              break;
            case 'starts-with':
              filterFn = (pokemon) => pokemon.name.toLowerCase().startsWith(condition.value.toLowerCase());
              break;
            default:
              filterFn = () => true;
          }
          break;
          
        case 'id':
          switch (condition.operator) {
            case 'equals':
              filterFn = (pokemon) => pokemon.id === parseInt(condition.value);
              break;
            case 'less-than':
              filterFn = (pokemon) => pokemon.id < parseInt(condition.value);
              break;
            case 'greater-than':
              filterFn = (pokemon) => pokemon.id > parseInt(condition.value);
              break;
            default:
              filterFn = () => true;
          }
          break;
          
        case 'type':
          filterFn = (pokemon) => pokemon.types.some(t => 
            t.type.name.toLowerCase().includes(condition.value.toLowerCase())
          );
          break;
          
        default:
          filterFn = () => true;
      }
      
      // Apply the connection logic
      if (index === 0 || !condition.connector) {
        // First condition OR connector is null (shouldn't happen except for first)
        result = result.filter(filterFn);
      } else if (condition.connector === 'AND') {
        // AND condition narrows down the current results
        result = result.filter(filterFn);
      } else if (condition.connector === 'OR') {
        // OR condition adds more results
        const additionalResults = allPokemon.filter(filterFn);
        const idsSet = new Set(result.map(p => p.id));
        additionalResults.forEach(p => {
          if (!idsSet.has(p.id)) {
            result.push(p);
          }
        });
      }
    });
    
    setFilteredPokemon(result);
  };
  
  // Get field options based on condition field
  const getOperatorOptions = (field: string) => {
    switch (field) {
      case 'name':
        return [
          { value: 'contains', label: 'Contains' },
          { value: 'equals', label: 'Equals' },
          { value: 'starts-with', label: 'Starts With' }
        ];
      case 'id':
        return [
          { value: 'equals', label: 'Equals' },
          { value: 'less-than', label: 'Less Than' },
          { value: 'greater-than', label: 'Greater Than' }
        ];
      case 'type':
        return [
          { value: 'contains', label: 'Contains' }
        ];
      default:
        return [];
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Advanced Pokémon Filter</h1>
      <p className="text-muted-foreground mb-8">
        Create complex filters and customize which fields to display
      </p>
      
      <div className="grid grid-cols-1 gap-6">
        {/* Selection (Filtering) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" /> Selection (Filter)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {conditions.map((condition, index) => (
                <div key={condition.id} className="grid grid-cols-12 gap-3 items-center">
                  {/* Logic connector */}
                  {index > 0 && (
                    <div className="col-span-12 sm:col-span-1">
                      <Select
                        value={condition.connector || 'AND'}
                        onValueChange={(value) => updateCondition(condition.id, 'connector', value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="AND" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  
                  {/* Field selector */}
                  <div className={`${index > 0 ? 'col-span-12 sm:col-span-3' : 'col-span-12 sm:col-span-4'}`}>
                    <Select
                      value={condition.field}
                      onValueChange={(value) => updateCondition(condition.id, 'field', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select field" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="name">Name</SelectItem>
                        <SelectItem value="id">ID</SelectItem>
                        <SelectItem value="type">Type</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Operator selector */}
                  <div className="col-span-12 sm:col-span-3">
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(condition.id, 'operator', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select operator" />
                      </SelectTrigger>
                      <SelectContent>
                        {getOperatorOptions(condition.field).map(op => (
                          <SelectItem key={op.value} value={op.value}>{op.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Value input */}
                  <div className="col-span-10 sm:col-span-4">
                    <Input
                      placeholder="Value"
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, 'value', e.target.value)}
                    />
                  </div>
                  
                  {/* Remove button */}
                  <div className="col-span-2 sm:col-span-1 flex justify-end">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCondition(condition.id)}
                      disabled={conditions.length <= 1}
                    >
                      <MinusCircle className="h-5 w-5 text-muted-foreground" />
                    </Button>
                  </div>
                </div>
              ))}
              
              <div className="flex items-center justify-between pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addCondition}
                  className="flex items-center gap-1"
                >
                  <PlusCircle className="h-4 w-4" /> Add Condition
                </Button>
                <Button onClick={applyFilter} className="flex items-center gap-1">
                  <Search className="h-4 w-4" /> Apply Filter
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Projection */}
        <Card>
          <CardHeader>
            <CardTitle>Projection (Fields to Display)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {projectionFields.map(field => (
                <div key={field.name} className="flex items-center space-x-2">
                  <Checkbox
                    id={`field-${field.name}`}
                    checked={field.selected}
                    onCheckedChange={() => toggleProjectionField(field.name)}
                  />
                  <label
                    htmlFor={`field-${field.name}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {field.display}
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        
        {/* Results */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>
              Results {filteredPokemon.length > 0 ? `(${filteredPokemon.length})` : ''}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">Loading Pokémon data...</div>
            ) : filteredPokemon.length > 0 ? (
              <div>
                <ScrollArea className="h-[600px]">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {filteredPokemon.map(pokemon => (
                      <PokemonCard 
                        key={pokemon.id} 
                        pokemon={pokemon} 
                      />
                    ))}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center py-10 text-muted-foreground">
                {conditions.some(c => c.value) ? (
                  <p>No Pokémon match your filter criteria. Try adjusting your filters.</p>
                ) : (
                  <p>Apply a filter to see results</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PokemonFilter;
