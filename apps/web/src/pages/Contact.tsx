import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, Github, Linkedin, Mail } from 'lucide-react';
import { CONTACT } from '@/lib/contact';
import { copyToClipboard } from '@/lib/clipboard';
import { useToast } from '@/hooks/use-toast';

const ARROW_LINK = 'inline-flex items-center gap-1 text-sm font-medium text-pokebrand-red hover:underline';

/**
 * Lifted out of Customisation, which is about how the app looks on this
 * device; reaching the maintainer had nothing to do with that. Linked from
 * the footer, the FAQ and the Customisation page's About card.
 */
const Contact: React.FC = () => {
  const { toast } = useToast();

  const sendEmail = async () => {
    if (await copyToClipboard(CONTACT.email)) {
      toast({ title: 'Email copied to clipboard', description: CONTACT.email });
    } else {
      window.location.href = `mailto:${CONTACT.email}`;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2">Contact</h1>
      <p className="text-muted-foreground mb-8">
        Found a bug, have an idea, or want to talk about MasterPokédex?
      </p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Three ways to reach us
          </CardTitle>
          <CardDescription>Whichever suits what you have to say.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="flex flex-col rounded-lg border p-4">
              <Github className="h-5 w-5 text-pokebrand-red" aria-hidden="true" />
              <h2 className="mt-2 text-sm font-semibold">GitHub</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Browse the source, open an issue, or contribute.
              </p>
              <div className="mt-3 flex flex-1 items-end">
                <a href={CONTACT.repo} target="_blank" rel="noopener noreferrer" className={ARROW_LINK}>
                  View on GitHub
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="flex flex-col rounded-lg border p-4">
              <Linkedin className="h-5 w-5 text-pokebrand-red" aria-hidden="true" />
              <h2 className="mt-2 text-sm font-semibold">LinkedIn</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Connect with the person behind the project.
              </p>
              <div className="mt-3 flex flex-1 items-end">
                <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer" className={ARROW_LINK}>
                  Connect on LinkedIn
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>
            <div className="flex flex-col rounded-lg border p-4">
              <Mail className="h-5 w-5 text-pokebrand-red" aria-hidden="true" />
              <h2 className="mt-2 text-sm font-semibold">Email</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                For anything that doesn't fit GitHub: questions, feedback, ideas.
              </p>
              <div className="mt-3 flex flex-1 items-end">
                <button type="button" onClick={() => void sendEmail()} className={ARROW_LINK}>
                  Send an email
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            An independent fan project, maintained by Nam Le.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Contact;
