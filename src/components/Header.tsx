import { Shield, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';

const TELEGRAM_LINK = 'https://t.me/tgdsc2025';

export function Header() {
  return (
    <header className="bg-card shadow-lg sticky top-0 z-50 border-b border-border">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 gradient-primary rounded-lg flex items-center justify-center shadow-glow">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold gradient-text">TET DSC Tech Squad</h1>
              <p className="text-sm text-muted-foreground">Watermark Remover Pro</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Button
              asChild
              className="bg-telegram hover:bg-telegram/90 text-primary-foreground"
            >
              <a href={TELEGRAM_LINK} target="_blank" rel="noopener noreferrer">
                <Send className="w-4 h-4 mr-2" />
                Join Telegram
              </a>
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
