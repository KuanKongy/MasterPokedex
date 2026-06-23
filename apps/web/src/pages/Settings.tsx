import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { BookOpen, FileText, Image as ImageIcon, Moon, Shield, Sun } from 'lucide-react';
import { SPRITE_STYLES, pokemonImage, useSpritePref, type SpriteStyle } from '@/prefs/SpritePrefContext';
import { cn } from '@/lib/utils';

/** Pikachu previews the sprite styles; nobody needs a caption to recognise it. */
const PREVIEW_ID = 25;

/**
 * Device-level preferences. Deliberately public — how the app looks is not
 * account data, and the FAQ and legal pages linked here must be reachable
 * before anyone signs up.
 */
const Settings: React.FC = () => {
  const { spriteStyle, setSpriteStyle } = useSpritePref();
  const { theme, setTheme } = useTheme();

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Settings</h1>
      <p className="text-muted-foreground mb-8">How the Pokédex looks on this device</p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Pokémon images
            </CardTitle>
            <CardDescription>
              Choose which rendition is shown everywhere a Pokémon appears — cards, teams, search
              and encounters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={spriteStyle}
              onValueChange={(value) => setSpriteStyle(value as SpriteStyle)}
              className="grid grid-cols-1 sm:grid-cols-3 gap-4"
            >
              {SPRITE_STYLES.map((style) => (
                <Label
                  key={style.value}
                  htmlFor={`sprite-${style.value}`}
                  className={cn(
                    'border rounded-lg p-4 cursor-pointer flex flex-col items-center gap-2 transition-colors',
                    spriteStyle === style.value ? 'border-primary ring-2 ring-primary/30' : 'hover:bg-muted/50',
                  )}
                >
                  <RadioGroupItem id={`sprite-${style.value}`} value={style.value} className="sr-only" />
                  <img
                    src={pokemonImage(PREVIEW_ID, style.value)}
                    alt={`${style.label} preview`}
                    className={cn('h-24 w-24 object-contain', style.value === 'sprite' && 'pixelated')}
                  />
                  <span className="font-medium">{style.label}</span>
                  <span className="text-xs text-muted-foreground text-center">{style.description}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 dark:hidden" />
              <Moon className="h-5 w-5 hidden dark:block" />
              Theme
            </CardTitle>
            <CardDescription>Light, dark, or follow this device's setting.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={theme ?? 'system'} onValueChange={setTheme}>
              <TabsList className="grid w-full max-w-sm grid-cols-3">
                <TabsTrigger value="light">Light</TabsTrigger>
                <TabsTrigger value="dark">Dark</TabsTrigger>
                <TabsTrigger value="system">System</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>About this Pokédex</CardTitle>
            <CardDescription>How the world works, and the fine print.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1">
            <Link to="/faq" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
              <BookOpen className="h-5 w-5 text-pokebrand-red" />
              <div>
                <div className="font-medium">FAQ &amp; World Guide</div>
                <div className="text-sm text-muted-foreground">
                  Teams, catching, friends, and where the data comes from
                </div>
              </div>
            </Link>
            <Separator />
            <Link to="/privacy" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
              <Shield className="h-5 w-5 text-pokebrand-red" />
              <div>
                <div className="font-medium">Privacy Policy</div>
                <div className="text-sm text-muted-foreground">What we store and what we never do with it</div>
              </div>
            </Link>
            <Separator />
            <Link to="/terms" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
              <FileText className="h-5 w-5 text-pokebrand-red" />
              <div>
                <div className="font-medium">Terms of Service</div>
                <div className="text-sm text-muted-foreground">The rules of the road</div>
              </div>
            </Link>
            <Separator />
            <p className="text-xs text-muted-foreground pt-3">
              Pokémon data and sprites are served via{' '}
              <a href="https://pokeapi.co" target="_blank" rel="noreferrer" className="underline">
                PokeAPI
              </a>
              . Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc. and
              GAME FREAK inc. This is a fan project, unaffiliated with any of them.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
