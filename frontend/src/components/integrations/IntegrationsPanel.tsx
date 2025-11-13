import { useEffect, useMemo, useState } from 'react';
import { integrationsApi, type IntegrationStatus, supersetIntegrationApi, type SupersetConfigPayload } from '../../services/integrationsApi';

type ConnectorKey = 'postgres' | 'nocodb' | 'superset';

const defaultSsh = {
  user: 'dbtunnel',
  host: '49.0.67.25',
  localPort: 5432,
  remoteHost: '127.0.0.1',
  remotePort: 5432,
  password: ''
};

export function IntegrationsPanel() {
  const [data, setData] = useState<IntegrationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ConnectorKey>('postgres');
  const [ssh, setSsh] = useState(defaultSsh);
  const [connecting, setConnecting] = useState(false);
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  // Superset (user-level, no secrets) – store locally only
  const [supersetUrl, setSupersetUrl] = useState<string>(() => {
    return localStorage.getItem('superset.url') ?? '';
  });
  const [supersetMode, setSupersetMode] = useState<'link' | 'embed'>(() => {
    return (localStorage.getItem('superset.mode') as 'link' | 'embed') ?? 'link';
  });
  const [supersetStatus, setSupersetStatus] = useState<{ configured: boolean; loginOk: boolean; error?: string } | null>(null);
  const [savingSuperset, setSavingSuperset] = useState(false);
  const [dashboards, setDashboards] = useState<Array<{ id: string; title: string; url: string }>>([]);
  const [newDash, setNewDash] = useState<{ title: string; url: string }>({ title: '', url: '' });
  const [addDashOpen, setAddDashOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<{ title: string; url: string }>({ title: '', url: '' });

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const res = await integrationsApi.status();
      setData(res.data);
      try {
        const s = await supersetIntegrationApi.status();
        setSupersetStatus(s.data);
      } catch {
        // ignore
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const res = await integrationsApi.status();
        if (!ignore) setData(res.data);
        try {
          const s = await supersetIntegrationApi.status();
          if (!ignore) setSupersetStatus(s.data);
          const d = await supersetIntegrationApi.listDashboards();
          if (!ignore) setDashboards(d.data.dashboards);
        } catch {
          // ignore
        }
      } catch (e) {
        if (!ignore) setError(e instanceof Error ? e.message : 'Failed to load');
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const sshCommand = useMemo(() => {
    return `ssh -N -L ${ssh.localPort}:${ssh.remoteHost}:${ssh.remotePort} ${ssh.user}@${ssh.host}`;
  }, [ssh]);

  async function handleConnect() {
    // We cannot open SSH from the browser; guide the user and poll status
    setConnecting(true);
    setConnectMsg('Waiting for tunnel…');
    const start = Date.now();
    const timeoutMs = 15000;
    let ok = false;
    while (Date.now() - start < timeoutMs) {
      await new Promise((r) => setTimeout(r, 1500));
      try {
        const res = await integrationsApi.status();
        setData(res.data);
        if (res.data.db.pingOk) {
          ok = true;
          break;
        }
      } catch {
        // ignore and keep polling
      }
      setConnectMsg('Still checking…');
    }
    setConnecting(false);
    setConnectMsg(ok ? 'Connected' : 'Could not detect tunnel');
  }

  function copySsh() {
    void navigator.clipboard?.writeText(sshCommand);
    setConnectMsg('SSH command copied');
  }

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white p-0 shadow-sm overflow-hidden">
      <header className="border-b border-emerald-100 px-6 py-4">
        <p className="text-xs uppercase tracking-widest text-emerald-500">Integrations</p>
        <h3 className="text-xl font-semibold text-emerald-900">Connections</h3>
      </header>

      <div className="grid gap-0 md:grid-cols-3">
        {/* Left: connectors list */}
        <aside className="border-r border-emerald-100 p-4 md:p-6">
          <ul className="space-y-2" role="list">
            <li>
              <button
                type="button"
                onClick={() => setSelected('postgres')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  selected === 'postgres' ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-emerald-50 text-emerald-700'
                }`}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-600 text-white text-xs font-bold overflow-hidden">
                  <img
                    src="/custom-icons/pg.webp"
                    alt="PostgreSQL"
                    className="h-6 w-6 object-cover"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      el.style.display = 'none';
                    }}
                  />
                  <span className="leading-none">PG</span>
                </span>
                <span>PostgreSQL</span>
              </button>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setSelected('superset')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  selected === 'superset' ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-emerald-50 text-emerald-700'
                }`}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-700 text-white text-xs font-bold">SS</span>
                <span>Superset</span>
              </button>
              <ul className="mt-2 ml-9 space-y-1" role="list">
                {dashboards.map((d) => (
                  <li key={d.id} className="flex items-center gap-2">
                    <button
                      type="button"
                      title={d.title}
                      className="flex-1 truncate text-left text-xs text-emerald-700 hover:underline"
                      onClick={() => {
                        setSupersetMode('link');
                        localStorage.setItem('superset.mode', 'link');
                        setSupersetUrl(d.url);
                      }}
                    >
                      {d.title}
                    </button>
                    <button
                      type="button"
                      className="text-emerald-700 text-xs"
                      title="Edit"
                      onClick={() => {
                        setSelected('superset');
                        setEditingId(d.id);
                        setEditDraft({ title: d.title, url: d.url });
                      }}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="text-rose-600 text-xs"
                      title="Delete"
                      onClick={async () => {
                        await supersetIntegrationApi.deleteDashboard(d.id);
                        const next = await supersetIntegrationApi.listDashboards();
                        setDashboards(next.data.dashboards);
                      }}
                    >
                      ×
                    </button>
                  </li>
                ))}
                <li>
                  {!addDashOpen ? (
                    <button
                      type="button"
                      className="inline-flex items-center gap-2 rounded border border-emerald-200 px-2 py-1 text-xs text-emerald-800 hover:border-emerald-400"
                      onClick={() => setAddDashOpen(true)}
                      title="Add dashboard"
                    >
                      <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">+</span>
                      <span>Add dashboard</span>
                    </button>
                  ) : (
                    <div className="space-y-1">
                      <input
                        className="w-full rounded border border-emerald-200 px-2 py-1 text-xs"
                        placeholder="Title"
                        value={newDash.title}
                        onChange={(e) => setNewDash({ ...newDash, title: e.target.value })}
                      />
                      <input
                        className="w-full rounded border border-emerald-200 px-2 py-1 text-xs"
                        placeholder="https://.../superset/dashboard/..."
                        value={newDash.url}
                        onChange={(e) => setNewDash({ ...newDash, url: e.target.value })}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="rounded bg-emerald-600 px-2 py-1 text-xs text-white hover:bg-emerald-500"
                          onClick={async () => {
                            if (!newDash.title || !newDash.url) return;
                            await supersetIntegrationApi.addDashboard({ title: newDash.title, url: newDash.url });
                            const d = await supersetIntegrationApi.listDashboards();
                            setDashboards(d.data.dashboards);
                            setNewDash({ title: '', url: '' });
                            setAddDashOpen(false);
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          className="rounded border border-emerald-200 px-2 py-1 text-xs text-emerald-800 hover:border-emerald-400"
                          onClick={() => {
                            setNewDash({ title: '', url: '' });
                            setAddDashOpen(false);
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              </ul>
            </li>
            <li>
              <button
                type="button"
                onClick={() => setSelected('nocodb')}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                  selected === 'nocodb' ? 'bg-emerald-50 text-emerald-800' : 'hover:bg-emerald-50 text-emerald-700'
                }`}
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded bg-emerald-500 text-white text-xs font-bold overflow-hidden">
                  <img
                    src="/custom-icons/nocodb.png"
                    alt="NocoDB"
                    className="h-6 w-6 object-cover"
                    onError={(e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      el.style.display = 'none';
                    }}
                  />
                  <span className="leading-none">NC</span>
                </span>
                <span>NocoDB</span>
                <span className="ml-auto text-emerald-500 text-xs">(soon)</span>
              </button>
            </li>
          </ul>
          
        </aside>

        {/* Right: detail/editor */}
        <div className="md:col-span-2 p-4 md:p-6">
          {loading && <p className="text-emerald-500">Checking status…</p>}
          {error && <p className="text-rose-600">{error}</p>}

          {!loading && !error && selected === 'postgres' && data && (
            <div className="space-y-6 text-sm text-emerald-900">
              <div>
                <p className="text-xs uppercase tracking-widest text-emerald-500">PostgreSQL</p>
                <h4 className="text-lg font-semibold text-emerald-900">Database Connection</h4>
                <p className="mt-1 text-emerald-700">
                  Env: <strong>{data.db.hasEnv ? 'present' : 'missing'}</strong> • Tunnel/Ping: <strong>{data.db.pingOk ? 'OK' : 'unreachable'}</strong>
                </p>
                <p className="mt-1">Host: <code>{data.db.host}</code> • Port: <code>{data.db.port}</code> • DB: <code>{data.db.database}</code> • User: <code>{data.db.userMasked ?? '-'}</code></p>
              </div>

              <div>
                <p className="font-semibold">Target Table</p>
                <p>
                  <code>{data.table.schema}.{data.table.name}</code> • Rows: {typeof data.table.rowCount === 'number' ? data.table.rowCount : 'n/a'}
                </p>
                <p>Raw API: <code>{data.endpoints.rawOrders}</code></p>
              </div>

              <div className="space-y-3">
                <p className="font-semibold">SSH Tunnel</p>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="text-xs text-emerald-700">SSH User
                    <input className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2" value={ssh.user} onChange={(e) => setSsh({ ...ssh, user: e.target.value })} />
                  </label>
                  <label className="text-xs text-emerald-700">SSH Host
                    <input className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2" value={ssh.host} onChange={(e) => setSsh({ ...ssh, host: e.target.value })} />
                  </label>
                  <label className="text-xs text-emerald-700">Local Port
                    <input type="number" className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2" value={ssh.localPort} onChange={(e) => setSsh({ ...ssh, localPort: Number(e.target.value) })} />
                  </label>
                  <label className="text-xs text-emerald-700">Remote Host
                    <input className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2" value={ssh.remoteHost} onChange={(e) => setSsh({ ...ssh, remoteHost: e.target.value })} />
                  </label>
                  <label className="text-xs text-emerald-700">Remote Port
                    <input type="number" className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2" value={ssh.remotePort} onChange={(e) => setSsh({ ...ssh, remotePort: Number(e.target.value) })} />
                  </label>
                  <label className="text-xs text-emerald-700">Password (not stored)
                    <input type="password" className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2" value={ssh.password} onChange={(e) => setSsh({ ...ssh, password: e.target.value })} />
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <button type="button" onClick={copySsh} className="rounded-lg border border-emerald-200 px-3 py-2 text-emerald-800 hover:border-emerald-400">Copy SSH Command</button>
                  <button type="button" onClick={handleConnect} disabled={connecting} className="rounded-lg bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-500 disabled:opacity-60">{connecting ? 'Connecting…' : 'Connect / Test'}</button>
                  {connectMsg && <span className="text-xs text-emerald-600">{connectMsg}</span>}
                </div>

                <p className="text-emerald-700 text-xs">Run the SSH command in your terminal, then click “Connect / Test”. The app will detect the tunnel automatically.</p>
                <pre className="mt-2 overflow-auto rounded bg-emerald-50 p-3 text-emerald-800"><code>{sshCommand}</code></pre>
              </div>
            </div>
          )}

          {!loading && !error && selected === 'nocodb' && (
            <div className="space-y-3 text-sm text-emerald-900">
              <p className="text-xs uppercase tracking-widest text-emerald-500">NocoDB</p>
              <h4 className="text-lg font-semibold text-emerald-900">Connection (coming soon)</h4>
              <p>We will surface a similar editor here for NocoDB API base URL, auth token, and dataset mapping, with test and status indicators.</p>
            </div>
          )}

          {!loading && !error && selected === 'superset' && (
            <div className="space-y-4 text-sm text-emerald-900">
              <div>
                <p className="text-xs uppercase tracking-widest text-emerald-500">Superset</p>
                <h4 className="text-lg font-semibold text-emerald-900">Dashboard Access (no credentials stored)</h4>
                <p className="mt-1 text-emerald-700">Paste the dashboard URL you can access. We will not store any username/password. You will authenticate directly with Superset.</p>
              </div>

              {editingId && (
                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <p className="text-xs uppercase tracking-widest text-emerald-500">Edit Dashboard</p>
                  <div className="mt-2 grid gap-3 md:grid-cols-3">
                    <label className="text-xs text-emerald-700">Title
                      <input
                        className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2"
                        value={editDraft.title}
                        onChange={(e) => setEditDraft({ ...editDraft, title: e.target.value })}
                      />
                    </label>
                    <label className="text-xs text-emerald-700 md:col-span-2">URL
                      <input
                        className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2"
                        value={editDraft.url}
                        onChange={(e) => setEditDraft({ ...editDraft, url: e.target.value })}
                      />
                    </label>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500"
                      onClick={async () => {
                        const id = editingId;
                        await supersetIntegrationApi.updateDashboard(id, { title: editDraft.title, url: editDraft.url });
                        const next = await supersetIntegrationApi.listDashboards();
                        setDashboards(next.data.dashboards);
                        setSupersetUrl(editDraft.url);
                        setEditingId(null);
                      }}
                    >
                      Save Changes
                    </button>
                    <button
                      type="button"
                      className="rounded-lg border border-emerald-200 px-3 py-2 text-sm text-emerald-800 hover:border-emerald-400"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              <label className="block text-xs text-emerald-700">Dashboard URL
                <input
                  className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2"
                  placeholder="https://your-superset/superset/dashboard/11/…"
                  value={supersetUrl}
                  onChange={(e) => setSupersetUrl(e.target.value)}
                  onBlur={() => localStorage.setItem('superset.url', supersetUrl)}
                />
              </label>
              <div className="flex items-center gap-4">
                <label className="inline-flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    checked={supersetMode === 'link'}
                    onChange={() => {
                      setSupersetMode('link');
                      localStorage.setItem('superset.mode', 'link');
                    }}
                  />
                  Open in new tab (recommended if embed blocked)
                </label>
                <label className="inline-flex items-center gap-2 text-xs">
                  <input
                    type="radio"
                    checked={supersetMode === 'embed'}
                    onChange={() => {
                      setSupersetMode('embed');
                      localStorage.setItem('superset.mode', 'embed');
                    }}
                  />
                  Try embed inside app
                </label>
              </div>
              {/* Dev-only credential entry for server-side test login (not stored in browser) */}
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs text-emerald-700">Superset Base URL
                  <input id="superset-base" className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2" placeholder="https://bi.example.com" />
                </label>
                <label className="text-xs text-emerald-700">Username
                  <input id="superset-user" className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2" placeholder="service_user" />
                </label>
                <label className="text-xs text-emerald-700">Password
                  <input id="superset-pass" type="password" className="mt-1 w-full rounded-lg border border-emerald-200 px-3 py-2" placeholder="••••••" />
                </label>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={supersetUrl || '#'}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-500 disabled:opacity-60"
                  onClick={(e) => { if (!supersetUrl) e.preventDefault(); }}
                >
                  Open Dashboard
                </a>
                <a
                  href={(function () {
                    try {
                      if (supersetUrl) {
                        const u = new URL(supersetUrl);
                        return `${u.origin}/login/`;
                      }
                    } catch {}
                    const base = (document.getElementById('superset-base') as HTMLInputElement)?.value?.trim();
                    return base ? `${base.replace(/\/$/, '')}/login/` : '#';
                  })()}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-emerald-200 px-3 py-2 text-emerald-800 hover:border-emerald-400 disabled:opacity-60"
                >
                  Open Superset Sign-in
                </a>
                <button
                  type="button"
                  className="rounded-lg border border-emerald-200 px-3 py-2 text-emerald-800 hover:border-emerald-400"
                  disabled={savingSuperset}
                  onClick={async () => {
                    const base = (document.getElementById('superset-base') as HTMLInputElement)?.value?.trim();
                    const user = (document.getElementById('superset-user') as HTMLInputElement)?.value?.trim();
                    const pass = (document.getElementById('superset-pass') as HTMLInputElement)?.value ?? '';
                    if (!base || !user || !pass) {
                      setSupersetStatus({ configured: false, loginOk: false, error: 'Base URL, username and password are required' });
                      return;
                    }
                    setSavingSuperset(true);
                    try {
                      const payload: SupersetConfigPayload = { baseUrl: base, username: user, password: pass, dashboardUrl: supersetUrl || undefined };
                      await supersetIntegrationApi.saveConfig(payload);
                      const s = await supersetIntegrationApi.status();
                      setSupersetStatus(s.data);
                    } catch (e) {
                      setSupersetStatus({ configured: true, loginOk: false, error: e instanceof Error ? e.message : 'Failed to save/test' });
                    } finally {
                      setSavingSuperset(false);
                    }
                  }}
                >
                  Save & Test Login
                </button>
                {supersetStatus && (
                  <span className={`text-xs ${supersetStatus.loginOk ? 'text-emerald-600' : 'text-amber-700'}`}>
                    {supersetStatus.loginOk ? 'Login OK' : supersetStatus.error ? `Login failed: ${supersetStatus.error}` : supersetStatus.configured ? 'Login failed' : 'Not configured'}
                  </span>
                )}
                {!supersetUrl && (
                  <span className="text-xs text-emerald-600">Paste a valid Superset dashboard URL</span>
                )}
              </div>

              {/* Saved dashboards are managed in the left bar (+ Add dashboard) */}
              {supersetMode === 'embed' && supersetUrl && (
                <div className="mt-2 h-96 overflow-hidden rounded-xl border border-emerald-100 shadow-inner">
                  <iframe
                    title="Superset Embedded"
                    src={supersetUrl}
                    className="h-full w-full"
                    sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
                  />
                </div>
              )}
              {supersetMode === 'embed' && (
                <p className="text-xs text-amber-700">Embedding may be blocked unless Superset is configured to allow framing from this origin. If the frame stays blank or shows errors, switch to “Open in new tab”.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
