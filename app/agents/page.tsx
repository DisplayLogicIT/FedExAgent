import Link from 'next/link';

const AGENTS = [
  {
    icon: '📦',
    name: 'FedEx Shipping Agent',
    desc: 'AI-powered label creation, rate comparison, address lookup, and shipment tracking. Talk to it like a person.',
    tag: 'Active',
    href: '/fedex',
    color: '#4D148C',
  },
  {
    icon: '🔜',
    name: 'UPS Agent',
    desc: 'Compare rates and create UPS labels. Coming soon.',
    tag: 'Coming Soon',
    href: '#',
    color: '#374151',
  },
  {
    icon: '🔜',
    name: 'Customs & Compliance',
    desc: 'Generate customs forms and check ITAR compliance for international shipments.',
    tag: 'Coming Soon',
    href: '#',
    color: '#374151',
  },
  {
    icon: '🔜',
    name: 'Invoice Agent',
    desc: 'Auto-generate shipping invoices and packing slips from shipment data.',
    tag: 'Coming Soon',
    href: '#',
    color: '#374151',
  },
];

export default function AgentsPage() {
  return (
    <>
      <div className="topbar">
        <div>
          <div className="page-title">Agent Marketplace</div>
          <div className="page-sub">AI agents for your operations</div>
        </div>
      </div>
      <div className="content">
        <div className="agent-grid">
          {AGENTS.map(a => (
            <Link key={a.name} href={a.href} style={{ display: 'block' }}>
              <div className="agent-card">
                <div className="agent-icon" style={{ background: a.color + '22' }}>{a.icon}</div>
                <div className="agent-name">{a.name}</div>
                <div className="agent-desc">{a.desc}</div>
                <span className="agent-tag">{a.tag}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
