import { IntegrationsPanel } from '../components/integrations/IntegrationsPanel';

export function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-6" data-testid="integrations-page">
      <IntegrationsPanel />
    </div>
  );
}

