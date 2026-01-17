import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Key, Shield, X, Loader2 } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  fetchCredentials,
  createCredential,
  deleteCredential,
  type Credential,
} from '../../api/credentialsApi';

export default function CredentialsPage() {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [type, setType] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadCredentials();
  }, []);

  async function loadCredentials() {
    try {
      const data = await fetchCredentials();
      setCredentials(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    if (!type.trim()) {
      setError('Type is required');
      return;
    }
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    setSaving(true);
    try {
      await createCredential(name.trim(), type.trim().toLowerCase(), {
        apiKey: apiKey.trim(),
      });
      setName('');
      setApiKey('');
      setType('');
      setIsCreating(false);
      loadCredentials();
    } catch (err: any) {
      setError(err.message || 'Failed to create credential');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this credential? Workflows using it will fail.'))
      return;
    try {
      await deleteCredential(id);
      setCredentials((creds) => creds.filter((c) => c.id !== id));
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground tracking-tight">Credentials</h1>
          <p className="text-sm text-muted-foreground font-light mt-1">
            Store API keys for your integrations
          </p>
        </div>
        {!isCreating && (
          <Button
            onClick={() => setIsCreating(true)}
            className="bg-secondary text-white hover:bg-secondary/90 font-medium active:scale-95"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Credential
          </Button>
        )}
      </div>

      {/* Create Form */}
      {isCreating && (
        <div className="bg-sidebar border border-border rounded-lg p-5 shadow-lg animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-foreground">New Credential</h2>
            <button
              onClick={() => {
                setIsCreating(false);
                setError('');
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Name</Label>
                <Input
                  placeholder="e.g., My OpenRouter Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-background border-border h-9"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Type</Label>
                <Input
                  placeholder="e.g., openrouter, openai"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="bg-background border-border h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">API Key / Token</Label>
              <Input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="bg-background border-border font-mono h-9"
              />
            </div>

            {error && (
              <p className="text-destructive text-xs bg-destructive/10 px-3 py-2 rounded border border-destructive/20">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="ghost"
                className="h-9 px-4 text-xs"
                onClick={() => {
                  setIsCreating(false);
                  setError('');
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="bg-secondary text-white hover:bg-secondary/90 font-medium h-9 px-4 text-xs active:scale-95"
              >
                {saving ? 'Saving...' : 'Save Credential'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Credentials List */}
      <div className="space-y-2.5">
        {loading && (
          <div className="text-center py-12 text-muted-foreground text-sm flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading...
          </div>
        )}

        {!loading && credentials.length === 0 && !isCreating && (
          <div className="text-center py-16 border border-dashed border-border rounded-lg bg-sidebar/30">
            <Shield className="w-10 h-10 mx-auto text-muted-foreground/20 mb-3" />
            <h3 className="text-foreground font-medium text-sm">No credentials yet</h3>
            <p className="text-muted-foreground text-xs mt-1">
              Add API keys for OpenAI, Telegram, OpenRouter, etc.
            </p>
          </div>
        )}

        {credentials.map((cred) => (
          <div
            key={cred.id}
            className="flex items-center justify-between p-3.5 bg-sidebar border border-border rounded-lg hover:border-primary/50 transition-all group"
          >
            <div className="flex items-center gap-4">
              <div className="p-2 rounded bg-background text-muted-foreground border border-border/50">
                <Key className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">{cred.name}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-background text-muted-foreground font-mono border border-border/50 uppercase tracking-widest">
                    {cred.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    Added {new Date(cred.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all h-8 w-8"
              onClick={() => handleDelete(cred.id)}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
