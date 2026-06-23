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
    q: 'Can I change how Pokémon look?',
    a: (
      <p>
        Yes — in <Link to="/settings" className="underline">Settings</Link> pick pixel sprites,
        official artwork, or Pokémon HOME renders. The choice applies everywhere a Pokémon is
        drawn and is remembered on this device. Dark mode lives there too.
      </p>
    ),
  },
  {
    q: 'Who are Ash, Misty and the other trainers already in the directory?',
    a: (
      <p>
        The demo cast — seeded accounts marked with a <strong>Demo</strong> badge so the trainer
        directory isn't an empty room before you arrive. They can't log in, and their teams are
        set in stone. Feel free to judge Ash's box organization.
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
        dataset, loaded into our own database and reshaped for the app. Region map art comes from
        the Bulbagarden archives. Map pin positions and location blurbs are our own curation.
      </p>
    ),
  },
  {
    q: 'How do I delete my account?',
    a: (
      <p>
        Email us (address in the <Link to="/privacy" className="underline">Privacy Policy</Link>)
        and the account is removed along with everything attached to it — profile, teams, caught
        Pokémon, bag, friendships, favorites, activity. Deletion cascades at the database level,
        so nothing lingers.
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
      How this Pokédex works — the world, the rules, and the fine print behind them.
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
      Something unanswered? See the <Link to="/terms" className="underline">Terms of Service</Link>{' '}
      and <Link to="/privacy" className="underline">Privacy Policy</Link>, or reach out via the
      contact address in either.
    </p>
  </div>
);

export default FAQ;
