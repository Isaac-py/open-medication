import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useEffect, useState, type FormEvent } from "react";
import { pullAccount, pushAccount, subscribeAccount } from "../sync/remote";

const urlKey = "open-medication.supabase.url";
const anonKey = "open-medication.supabase.anon";

export function Sync() {
  const [url, setUrl] = useState(localStorage.getItem(urlKey) ?? import.meta.env.VITE_SUPABASE_URL ?? "");
  const [key, setKey] = useState(localStorage.getItem(anonKey) ?? import.meta.env.VITE_SUPABASE_ANON_KEY ?? "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [client, setClient] = useState<SupabaseClient | null>(null);

  useEffect(() => {
    if (!client) return;
    return subscribeAccount(client, () => setMessage("Updated from your other device."));
  }, [client]);

  async function signIn(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const client = clientFrom(url, key);
      const auth = await client.auth.signInWithPassword({ email, password });
      if (auth.error) throw auth.error;
      localStorage.setItem(urlKey, url.trim());
      localStorage.setItem(anonKey, key.trim());
      await pullAccount(client);
      await pushAccount(client);
      setClient(client);
      setMessage("Signed in. This laptop will send doses and pick up changes.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in");
    }
  }

  return (
    <section>
      <header className="page-head">
        <p className="eyebrow">Sync</p>
        <h1>Your account</h1>
      </header>
      <form className="card form" onSubmit={(event) => void signIn(event)}>
        <label>
          Supabase URL
          <input value={url} onChange={(event) => setUrl(event.target.value)} autoComplete="off" />
        </label>
        <label>
          Anon key
          <input value={key} onChange={(event) => setKey(event.target.value)} autoComplete="off" />
        </label>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <button type="submit">Sign in and sync</button>
      </form>
      {message ? <p className="empty">{message}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}

export function clientFrom(url: string, key: string): SupabaseClient {
  return createClient(url.trim(), key.trim(), {
    auth: { persistSession: true, autoRefreshToken: true },
  });
}
