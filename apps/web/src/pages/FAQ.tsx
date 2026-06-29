import React from 'react';
import { Link } from 'react-router-dom';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';

/**
 * The world guide. Questions are phrased the way a user would actually ask
 * them — leading with what they're unsure about, not with feature names.
 * Ordered in loose groups: the app and your account, reading the dex, the
 * world and its rules, trainers and social, then data and fine print.
 */
const FAQ_ITEMS: Array<{ q: string; a: React.ReactNode }> = [
  {
    q: 'What is this app, exactly?',
    a: (
      <p>
        A National Pokédex you can live in. The reference side covers every Pokémon — stats,
        types, matchups, evolutions, moves, items, and the regions and routes where they appear.
        The trainer side is yours: build teams, catch Pokémon into them, keep a bag, favorite
        species, and make friends with other trainers.
      </p>
    ),
  },
  {
    q: 'Do I need an account?',
    a: (
      <p>
        Not to browse. The Pokédex, the advanced filter, the map and the item catalogue are open
        to everyone. You need an account (email + password) the moment something has to be{' '}
        <em>yours</em> — teams, caught Pokémon, your bag, favorites, and friendships all live on
        your trainer profile.
      </p>
    ),
  },
  {
    q: 'Can I change how Pokémon look?',
    a: (
      <p>
        Yes — in <Link to="/settings" className="underline">Settings</Link> pick the games' pixel
        sprites, the official artwork, or Pokémon HOME renders; the choice applies everywhere a
        Pokémon is drawn and is remembered on this device. The site's chrome is yours too: choose
        one of ten Poké Balls to recolor the whole app, and how that ball is drawn — the games'
        own bag icon, our pixel logo, or its fine version. Dark mode is the sun-and-moon button
        in the header.
      </p>
    ),
  },
  {
    q: "What does 'How to get one' on a Pokémon's page tell me?",
    a: (
      <p>
        How you'd actually obtain it: the full evolution method for every branch (Eevee lists all
        eight), a summary of where it appears in the wild, and — for Megas and Gigantamax — what
        the transformation itself requires. If it can't be caught on any route, the page says
        what to evolve or trade for instead.
      </p>
    ),
  },
  {
    q: "Why does Bulbasaur's page show Mega Venusaur?",
    a: (
      <p>
        Forms are family-scoped: every stage of a family shows the family's Megas, Gigantamax and
        regional forms, because that's what you're really planning toward when you catch the
        first stage. Expand or collapse them per page, or flip{' '}
        <strong>Always show alternate forms</strong> in{' '}
        <Link to="/settings" className="underline">Settings</Link> to keep them open everywhere.
      </p>
    ),
  },
  {
    q: 'Why do I sometimes see a Poké Ball where artwork should be?',
    a: (
      <p>
        That's the end of the sprite ladder. We try your chosen rendition first, then the other
        two, then the base form's art — only when nothing exists anywhere does your themed Poké
        Ball stand in, with a note that no artwork exists for that form yet. About a dozen of
        1,351 forms need it.
      </p>
    ),
  },
  {
    q: 'How does the map work?',
    a: (
      <p>
        One region at a time, Kanto through Paldea, plus Hisui and Orre. The 399 pins are placed
        from the games' own Town Map data; the few regions that never drew one are placed by
        hand. Every pin opens a location with artwork, a description, its neighbours, and every
        Pokémon that lives there.
      </p>
    ),
  },
  {
    q: 'What do the type badges mean?',
    a: (
      <p>
        Every Pokémon and move wears its type — 18 in all. Open a{' '}
        <Link to="/types" className="underline">type's page</Link> for the full effectiveness
        chart: what it hits for double damage, what resists it, and what it can't touch at all.
        A Pokémon's own page already does the two-type math for you.
      </p>
    ),
  },
  {
    q: 'How does evolution work?',
    a: (
      <p>
        In families, laid out stage by stage on the{' '}
        <Link to="/evolutions" className="underline">Evolutions</Link> page. The methods are the
        games' own — levels, stones, trades, friendship, and the strange conditions they love —
        and the exact requirement is spelled out on every branch, on both the family page and
        each Pokémon's own.
      </p>
    ),
  },
  {
    q: 'What are Mega Evolution and Gigantamax, exactly?',
    a: (
      <p>
        Mega Evolution is a temporary transformation in battle: a bonded trainer with a Key
        Stone, the right Mega Stone held, and a Pokémon goes beyond its final stage until the
        battle ends — all 97 are on the{' '}
        <Link to="/mega-evolutions" className="underline">Mega Evolutions</Link> page. Gigantamax
        is Galar's phenomenon: Dynamax energy makes a Pokémon colossal, and for a chosen few
        changes its very shape — those 34 are on the{' '}
        <Link to="/gigantamax" className="underline">Gigantamax</Link> page.
      </p>
    ),
  },
  {
    q: "What's a team, and why won't it hold a 7th Pokémon?",
    a: (
      <p>
        Teams come in three categories with hard size limits, enforced by the database itself: a{' '}
        <strong>Party</strong> holds 6 (like the games), a <strong>Box</strong> holds 30, and a{' '}
        <strong>Showcase</strong> holds 12. When a team is full, catch into another one or move
        someone out first. You can have as many teams as you like.
      </p>
    ),
  },
  {
    q: 'How do levels work? I never set one.',
    a: (
      <p>
        You never do — you set <strong>experience</strong>. Each species has an official growth
        rate (fast, slow, erratic…), and the level is derived from your Pokémon's experience on
        that curve, the same way the games do it. Give a Pokémon more experience in its edit menu
        and the level follows.
      </p>
    ),
  },
  {
    q: 'Can I catch a shiny?',
    a: (
      <p>
        Any Pokémon can be caught as shiny — just flip the switch in the catch dialog. Shinies get
        a ✨ on their card, count toward the shiny tally on your profile, and announce themselves
        in your activity feed. No 1-in-4096 odds here; we're not monsters.
      </p>
    ),
  },
  {
    q: 'What is the bag, and where do items come from?',
    a: (
      <p>
        The catalogue lists every item known to the dex — over two thousand, from Poké Balls to
        Ability Patches. Add any of them to your bag and adjust quantities with the steppers.
        Quantities can't go below zero; the database checks, so no phantom Potions.
      </p>
    ),
  },
  {
    q: 'How do friends work?',
    a: (
      <p>
        Find a trainer in the directory and send a request; they accept or decline. Friends see
        each other's activity feeds, and friendship is also the key to private profiles: a
        trainer who has gone private is visible only to their accepted friends.
      </p>
    ),
  },
  {
    q: 'What can other people see about me?',
    a: (
      <p>
        Public profiles (the default) show your username, display name, bio, region, rank,
        badges, counts, teams and caught Pokémon. Flip <strong>Public profile</strong> off in
        your profile settings and only accepted friends see any of it. Your email address is
        never visible to anyone, and your bag is private even from friends.
      </p>
    ),
  },
  {
    q: 'Who are Ash, Misty and the other trainers already in the directory?',
    a: (
      <p>
        The resident cast — accounts we seeded so the directory has familiar faces to meet. They
        wear a <strong>Resident</strong> badge, nobody signs in as them, and their teams don't
        change. Everyone else you meet is a real trainer. Feel free to judge Ash's box
        organization.
      </p>
    ),
  },
  {
    q: 'Where does the data come from?',
    a: (
      <p>
        Species, moves, abilities, items, locations and encounter tables come from the open{' '}
        <a href="https://pokeapi.co" target="_blank" rel="noreferrer" className="underline">
          PokeAPI
        </a>{' '}
        dataset, loaded into our own database and reshaped for the app — the three Pokémon
        renditions are its sprite collection too. Location prose and art, the region maps, and
        the Town Map data behind the map pins come from{' '}
        <a
          href="https://bulbapedia.bulbagarden.net"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          Bulbapedia
        </a>{' '}
        and the Bulbagarden Archives (self-hosted, with our own curation on top). Item art that
        PokeAPI lacks is filled from Bulbapedia's bag icons, cross-referenced against{' '}
        <a href="https://pokemondb.net" target="_blank" rel="noreferrer" className="underline">
          PokémonDB
        </a>
        , with the TM discs from{' '}
        <a
          href="https://github.com/msikma/pokesprite"
          target="_blank"
          rel="noreferrer"
          className="underline"
        >
          pokesprite
        </a>
        .
      </p>
    ),
  },
  {
    q: 'How do I delete my account?',
    a: (
      <p>
        Email us — the Contact card in{' '}
        <Link to="/settings" className="underline">Settings</Link> has the address, and it's in
        the <Link to="/privacy" className="underline">Privacy Policy</Link> too — and the account
        is removed along with everything attached to it: profile, teams, caught Pokémon, bag,
        friendships, favorites, activity. Deletion cascades at the database level, so nothing
        lingers.
      </p>
    ),
  },
  {
    q: 'Is this an official Pokémon product?',
    a: (
      <p>
        No. MasterPokedex is a fan project, unaffiliated with Nintendo, Creatures Inc. or GAME
        FREAK inc. Pokémon and Pokémon character names are their trademarks. Nothing here is for
        sale.
      </p>
    ),
  },
];

const FAQ: React.FC = () => (
  <div className="container mx-auto px-4 py-10 max-w-3xl">
    <h1 className="text-3xl md:text-4xl font-extrabold mb-2">FAQ &amp; World Guide</h1>
    <p className="text-muted-foreground mb-8">
      How this Pokédex works — the world, the rules, and the lore behind them.
    </p>

    <Card>
      <CardContent className="pt-2 pb-4">
        <Accordion type="single" collapsible className="w-full">
          {FAQ_ITEMS.map((item, index) => (
            <AccordionItem key={index} value={`item-${index}`}>
              <AccordionTrigger className="text-left">{item.q}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>

    <p className="text-sm text-muted-foreground mt-8">
      Something unanswered? The Contact card in{' '}
      <Link to="/settings" className="underline">Settings</Link> is the fastest way to reach us;
      the <Link to="/terms" className="underline">Terms of Service</Link> and{' '}
      <Link to="/privacy" className="underline">Privacy Policy</Link> cover the fine print.
    </p>
  </div>
);

export default FAQ;
