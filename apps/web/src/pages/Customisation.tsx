import React from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from 'next-themes';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { BookOpen, FileText, Image as ImageIcon, Mail, Shield, Sparkles } from 'lucide-react';
import { SPRITE_STYLES, pokemonImage, useSpritePref, type SpriteStyle } from '@/prefs/SpritePrefContext';
import { BALL_ARTS, BALL_STYLES, ballSprite, useBallPref, type BallArt, type BallStyle } from '@/prefs/BallPrefContext';
import { BALL_SWATCHES } from '@/prefs/ballTheme';
import HelpTip from '@/components/HelpTip';
import { ALWAYS_SHOW_MEGAS, useBooleanPref } from '@/hooks/useBooleanPref';
import { cn } from '@/lib/utils';

/** Pikachu previews the sprite styles; nobody needs a caption to recognise it. */
const PREVIEW_ID = 25;

/**
 * Device-level preferences. Deliberately public — how the app looks is not
 * account data, and the FAQ and legal pages linked here must be reachable
 * before anyone signs up. Reaching the maintainer is a separate errand, so
 * Contact is its own page and only linked from here.
 */
const Customisation: React.FC = () => {
  const { spriteStyle, setSpriteStyle } = useSpritePref();
  const { ballStyle, setBallStyle, ballArt, setBallArt } = useBallPref();
  const { resolvedTheme } = useTheme();
  const [alwaysShowMegas, setAlwaysShowMegas] = useBooleanPref(ALWAYS_SHOW_MEGAS);
  // Dark mode itself lives on the header's sun/moon button; only the swatch
  // preview needs to know which set of palettes is currently on screen.
  const swatchMode = resolvedTheme === 'dark' ? 'dark' : 'light';

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Customisation</h1>
      <p className="text-muted-foreground mb-8">How the Pokédex looks on this device</p>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="h-5 w-5" />
              Pokémon images
            </CardTitle>
            <CardDescription>
              Which rendition of a Pokémon is drawn everywhere one appears — cards, teams, search,
              encounters. Remembered on this device.
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
                  <span className="font-medium">
                    {style.label}
                    {style.value === 'home' && (
                      <HelpTip title="Pokémon HOME" className="ml-1">
                        Nintendo's cloud storage app for Pokémon; its tidy 3D renders cover
                        every species in one style.
                      </HelpTip>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground text-center">{style.description}</span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <img src={ballSprite(ballStyle, ballArt)} alt="" className="h-6 w-6 pixelated" />
              Poké Ball style
            </CardTitle>
            <CardDescription>
              Pick a ball and the whole site wears it — header, footer, buttons, links and spinner
              take their colors from that ball's shell and markings. The art style picks how the
              ball itself is drawn, matching the Pokémon image styles above.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={ballArt}
              onValueChange={(value) => setBallArt(value as BallArt)}
              className="grid grid-cols-1 gap-3 sm:grid-cols-3"
            >
              {BALL_ARTS.map((art) => (
                <Label
                  key={art.value}
                  htmlFor={`ball-art-${art.value}`}
                  className={cn(
                    'border rounded-lg p-3 cursor-pointer flex flex-col items-center gap-1.5 transition-colors',
                    ballArt === art.value ? 'border-primary ring-2 ring-primary/30' : 'hover:bg-muted/50',
                  )}
                >
                  <RadioGroupItem id={`ball-art-${art.value}`} value={art.value} className="sr-only" />
                  <img src={ballSprite(ballStyle, art.value)} alt="" className="h-11 w-11 pixelated" />
                  <span className="text-xs font-medium text-center">{art.label}</span>
                  <span className="text-[0.7rem] font-normal leading-tight text-center text-muted-foreground">
                    {art.description}
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <RadioGroup
              value={ballStyle}
              onValueChange={(value) => setBallStyle(value as BallStyle)}
              className="grid grid-cols-2 sm:grid-cols-5 gap-3"
            >
              {BALL_STYLES.map((ball) => (
                <Label
                  key={ball.value}
                  htmlFor={`ball-${ball.value}`}
                  className={cn(
                    'border rounded-lg p-3 cursor-pointer flex flex-col items-center gap-1.5 transition-colors',
                    ballStyle === ball.value ? 'border-primary ring-2 ring-primary/30' : 'hover:bg-muted/50',
                  )}
                >
                  <RadioGroupItem id={`ball-${ball.value}`} value={ball.value} className="sr-only" />
                  <img src={ballSprite(ball.value, ballArt)} alt="" className="h-11 w-11 pixelated" />
                  <span className="text-xs font-medium text-center">{ball.label}</span>
                  <span className="flex gap-1">
                    {BALL_SWATCHES[ball.value][swatchMode].map((hex, index) => (
                      <span
                        key={index}
                        className="h-2.5 w-2.5 rounded-full border border-border"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-pokebrand-red" />
              Mega Evolutions
            </CardTitle>
            <CardDescription>
              Show Megas, Gigantamax and regional forms expanded by default, on every stage of a
              family rather than only the one that owns them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Label
              htmlFor="always-show-megas"
              className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border p-3"
            >
              <span className="text-sm font-medium">
                Always show alternate forms
                <HelpTip title="Alternate forms" faq="family-forms" className="ml-1">
                  Megas, Gigantamax and regional forms appear with their switches already on,
                  attached to every stage of the family.
                </HelpTip>
              </span>
              <Switch id="always-show-megas" checked={alwaysShowMegas} onCheckedChange={setAlwaysShowMegas} />
            </Label>
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
            <Link to="/contact" className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 transition-colors">
              <Mail className="h-5 w-5 text-pokebrand-red" />
              <div>
                <div className="font-medium">Contact</div>
                <div className="text-sm text-muted-foreground">Report a bug, send an idea, or just say hello</div>
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

export default Customisation;
