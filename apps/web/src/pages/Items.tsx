import React from 'react';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';
import ItemInventory from '../components/ItemInventory';
import ItemCatalogue from '../components/ItemCatalogue';
import { useAuth } from '@/auth/AuthProvider';

/**
 * Items page: the catalogue is public reference data; the bag is yours and
 * needs a session — but the page itself never locks you out.
 */
const Items: React.FC = () => {
  const { session } = useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Items</h1>
      <p className="text-muted-foreground mb-8">Your bag, and every item known to the dex</p>

      <Tabs defaultValue={session ? 'bag' : 'catalogue'} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="bag">My Bag</TabsTrigger>
          <TabsTrigger value="catalogue">Catalogue</TabsTrigger>
        </TabsList>

        <TabsContent value="bag">
          {session ? (
            <ItemInventory />
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="font-medium mb-1">Sign in to see your bag</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Items you collect are stored on your trainer account.
                </p>
                <Link to="/login">
                  <Button>
                    <LogIn className="mr-2 h-4 w-4" /> Sign in
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="catalogue">
          <ItemCatalogue />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Items;
