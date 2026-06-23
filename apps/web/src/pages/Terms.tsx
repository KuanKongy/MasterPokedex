import React from 'react';
import { Link } from 'react-router-dom';
import LegalPage, { LegalSection } from '../components/LegalPage';

const CONTACT_EMAIL = 'khanhpronam@gmail.com';

const Terms: React.FC = () => (
  <LegalPage title="Terms of Service" updated="June 23, 2026">
    <LegalSection n={1} title="Introduction">
      <p>
        Welcome to MasterPokedex ("we", "our", "us", or "Service"). As you have just clicked our
        Terms of Service, please pause, grab a Poké Puff and carefully read the following pages. It
        will take you approximately 8 minutes.
      </p>
      <p>
        These Terms of Service ("Terms") govern your use of the MasterPokedex web application and
        API. By accessing or using the Service you agree to be bound by these Terms. If you
        disagree with any part of them, the Pokédex will still let you browse — but you may not
        create an account or use the trainer features.
      </p>
      <p>
        Our <Link to="/privacy" className="underline">Privacy Policy</Link> describes how we handle
        your data and is part of these Terms.
      </p>
    </LegalSection>

    <LegalSection n={2} title="Communications">
      <p>
        The only emails the Service sends are transactional: account confirmation and password
        recovery, delivered through our authentication provider. There is no newsletter, and we
        will not add you to one.
      </p>
    </LegalSection>

    <LegalSection n={3} title="Accounts">
      <p>
        Browsing the Pokédex, the map, items and public trainer profiles requires no account.
        Creating teams, catching Pokémon, keeping a bag, favorites and friendships require one.
        You must provide a valid email address and are responsible for keeping your password
        confidential and for all activity under your account.
      </p>
      <p>
        Usernames are unique, permanent, and visible to other users. Do not register a username
        you do not have the right to use, or one that impersonates another person or trainer.
      </p>
    </LegalSection>

    <LegalSection n={4} title="Content You Provide">
      <p>
        Display names, bios, avatar URLs, team names, nicknames and notes are yours. By submitting
        them you grant us the license needed to store and display them to the people your profile
        settings allow. You remain responsible for what you write; we may remove content that
        violates Section 6 and, in serious or repeated cases, the account that posted it.
      </p>
    </LegalSection>

    <LegalSection n={5} title="Fair Use of the Service">
      <p>
        The API behind the Service is open for the app's own use. Reasonable personal scripting
        against your own data is fine; sustained scraping, bulk account creation, or load that
        degrades the Service for others is not.
      </p>
    </LegalSection>

    <LegalSection n={6} title="Prohibited Uses">
      <p>You agree not to use the Service:</p>
      <p>
        (a) in any way that violates any applicable law or regulation; (b) to impersonate another
        person, trainer, or company; (c) to harass, abuse, insult, harm, defame or intimidate any
        other user, including through team names, nicknames, bios or friend requests; (d) to
        submit false or misleading information; (e) to upload or link to material containing
        viruses or any other malicious code; (f) to attempt to gain unauthorized access to other
        accounts, the API, or the database, including by manipulating tokens or identifiers; (g)
        to interfere with or circumvent rate limits, capacity rules, or any security feature of
        the Service.
      </p>
    </LegalSection>

    <LegalSection n={7} title="The Pokédex Data">
      <p>
        Species, moves, abilities, items, locations and encounter data are reference data derived
        from the open PokeAPI dataset, provided as-is for informational and entertainment
        purposes. We do not guarantee its accuracy and it may lag behind the games.
      </p>
    </LegalSection>

    <LegalSection n={8} title="Intellectual Property">
      <p>
        The Service's own code, design, and original text are the property of the maintainer.
        These Terms do not grant you rights to use the MasterPokedex name or branding except to
        refer to the Service.
      </p>
    </LegalSection>

    <LegalSection n={9} title="Fan Project Notice">
      <p>
        Pokémon and Pokémon character names are trademarks of Nintendo, Creatures Inc. and GAME
        FREAK inc. MasterPokedex is an unofficial fan project. It is not affiliated with,
        endorsed, sponsored, or approved by any of those companies, charges no money, and exists
        for love of the games. If you are a rights holder with a concern, contact us and we will
        respond promptly.
      </p>
    </LegalSection>

    <LegalSection n={10} title="Feedback and Error Reporting">
      <p>
        You may provide feedback, bug reports, or suggestions. You agree that we may use them
        without restriction or compensation — that is the point of sending them.
      </p>
    </LegalSection>

    <LegalSection n={11} title="Links to Other Web Sites">
      <p>
        The Service links to third-party sites — PokeAPI, Bulbapedia, sprite repositories — that
        we do not control and are not responsible for. Their terms and privacy policies are their
        own.
      </p>
    </LegalSection>

    <LegalSection n={12} title="Termination">
      <p>
        You may stop using the Service at any time and may request deletion of your account, which
        removes your trainer profile and everything attached to it. We may suspend or terminate
        accounts that breach these Terms, with or without notice, though for anything short of
        abuse we will tell you why.
      </p>
    </LegalSection>

    <LegalSection n={13} title="Service Availability">
      <p>
        This is a fan project running on free-tier infrastructure. The Service may pause, slow
        down, or go offline without notice, and stored data — while backed by a real database —
        carries no availability commitment. Do not keep your only copy of anything here.
      </p>
    </LegalSection>

    <LegalSection n={14} title="Changes to the Service">
      <p>
        We may add, change, or remove features at any time. Capacity rules (like party size),
        ranks, and other game-flavored mechanics may be rebalanced; your data will be migrated
        where reasonably possible.
      </p>
    </LegalSection>

    <LegalSection n={15} title="Amendments to Terms">
      <p>
        We may amend these Terms at any time by posting the amended version on this page and
        updating the date above. Continued use after changes take effect constitutes acceptance.
        It is your responsibility to check this page periodically.
      </p>
    </LegalSection>

    <LegalSection n={16} title="Disclaimer of Warranty" caps>
      <p>
        THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT WARRANTIES OF ANY
        KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
        MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF
        PERFORMANCE. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR ERROR
        FREE, THAT DEFECTS WILL BE CORRECTED, OR THAT THE POKÉDEX DATA IS ACCURATE OR COMPLETE.
      </p>
    </LegalSection>

    <LegalSection n={17} title="Limitation of Liability" caps>
      <p>
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL THE MAINTAINER OR CONTRIBUTORS
        BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES,
        INCLUDING LOSS OF DATA, ARISING OUT OF OR RELATED TO YOUR USE OF THE SERVICE. THE
        SERVICE IS FREE; OUR TOTAL LIABILITY FOR ANY CLAIM SHALL NOT EXCEED THE AMOUNT YOU PAID
        TO USE IT, WHICH IS ZERO.
      </p>
    </LegalSection>

    <LegalSection n={18} title="Governing Law">
      <p>
        These Terms shall be governed by the laws of the Province of British Columbia, Canada,
        without regard to conflict of law provisions.
      </p>
    </LegalSection>

    <LegalSection n={19} title="Waiver and Severability">
      <p>
        Our failure to enforce any provision of these Terms is not a waiver of it. If any
        provision is held invalid, the remaining provisions remain in full force.
      </p>
    </LegalSection>

    <LegalSection n={20} title="Acknowledgement">
      <p>
        BY USING THE SERVICE YOU ACKNOWLEDGE THAT YOU HAVE READ THESE TERMS OF SERVICE AND AGREE
        TO BE BOUND BY THEM.
      </p>
    </LegalSection>

    <LegalSection n={21} title="Contact Us">
      <p>
        Please send your feedback, comments, and requests for technical support by email:{' '}
        <a href={`mailto:${CONTACT_EMAIL}`} className="underline">
          {CONTACT_EMAIL}
        </a>
        .
      </p>
    </LegalSection>
  </LegalPage>
);

export default Terms;
