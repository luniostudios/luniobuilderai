"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Check, CreditCard, Download, ExternalLink, KeyRound, Loader2, Package, Plus, Save, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Database } from "@/lib/database.types";

type Product = Database["public"]["Tables"]["site_products"]["Row"];
type Subscriber = { id: string; email: string; consent_at: string; unsubscribed_at: string | null; unsubscribeUrl: string | null };
type Order = { id: string; customer_email: string | null; status: string; amount_total: number; currency: string; items: unknown; shipping_address: unknown; created_at: string };
type Campaign = { id: string; subject: string; from_email: string; recipient_count: number; sent_count: number; status: string; created_at: string };
type ProtectedPage = { path: string; title: string; access_mode: string; passwordConfigured: boolean };
type ProductForm = { sku: string; name: string; description: string; image_url: string; price: string; currency: string; requires_shipping: boolean; active: boolean };

const emptyProduct: ProductForm = { sku: "", name: "", description: "", image_url: "", price: "", currency: "usd", requires_shipping: false, active: true };
const countries = ["US", "CA", "GB", "AU", "NZ", "DE", "FR", "IE", "NL", "SG"];

async function readResult<T>(response: Response): Promise<T & { error?: string }> {
  const result = await response.json().catch(() => ({})) as T & { error?: string };
  if (!response.ok) throw new Error(result.error || "The request could not be completed.");
  return result;
}

function csvCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

export default function ProjectServices({ projectId, publishedSlug }: { projectId: string; publishedSlug: string | null }) {
  const [stripeConnected, setStripeConnected] = useState(false);
  const [stripeReady, setStripeReady] = useState(false);
  const [resendConfigured, setResendConfigured] = useState(false);
  const [resendKey, setResendKey] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [campaignSubject, setCampaignSubject] = useState("");
  const [campaignText, setCampaignText] = useState("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [country, setCountry] = useState("US");
  const [products, setProducts] = useState<Product[]>([]);
  const [productForm, setProductForm] = useState<ProductForm>(emptyProduct);
  const [editingProductId, setEditingProductId] = useState("");
  const [subscribers, setSubscribers] = useState<Subscriber[] | null>(null);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [privatePages, setPrivatePages] = useState<ProtectedPage[]>([]);
  const [pagePasswords, setPagePasswords] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    void fetch(`/api/projects/${projectId}/stripe-connect`).then(readResult<{ connected?: boolean; chargesEnabled?: boolean }>)
      .then((result) => { if (active) { setStripeConnected(Boolean(result.connected)); setStripeReady(Boolean(result.chargesEnabled)); } })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load Stripe status."); });
    void fetch(`/api/projects/${projectId}/store-products`).then(readResult<{ products?: Product[] }>)
      .then((result) => { if (active) setProducts(result.products ?? []); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load products."); });
    void fetch(`/api/projects/${projectId}/private-pages`).then(readResult<{ pages?: ProtectedPage[] }>)
      .then((result) => { if (active) setPrivatePages(result.pages ?? []); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load protected pages."); });
    void fetch(`/api/projects/${projectId}/integrations/resend`).then(readResult<{ configured?: boolean }>)
      .then((result) => { if (active) setResendConfigured(Boolean(result.configured)); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load email settings."); });
    void fetch(`/api/projects/${projectId}/newsletter/campaigns`).then(readResult<{ campaigns?: Campaign[] }>)
      .then((result) => { if (active) setCampaigns(result.campaigns ?? []); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : "Could not load newsletter history."); });
    return () => { active = false; };
  }, [projectId]);

  function updateProduct<K extends keyof ProductForm>(key: K, value: ProductForm[K]) {
    setProductForm((current) => ({ ...current, [key]: value }));
  }

  async function connectStripe() {
    setBusy(true);
    setError("");
    try {
      const result = await readResult<{ url: string }>(await fetch(`/api/projects/${projectId}/stripe-connect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country }),
      }));
      window.location.assign(result.url);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not connect Stripe.");
      setBusy(false);
    }
  }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const amount = Number(productForm.price);
    if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) < 1) {
      setError("Enter a valid product price.");
      setBusy(false);
      return;
    }
    try {
      const response = await fetch(`/api/projects/${projectId}/store-products`, {
        method: editingProductId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editingProductId ? { id: editingProductId } : {}),
          ...productForm,
          amount_cents: Math.round(amount * 100),
        }),
      });
      const result = await readResult<{ product: Product }>(response);
      setProducts((current) => editingProductId
        ? current.map((product) => product.id === result.product.id ? result.product : product)
        : [result.product, ...current]);
      setProductForm(emptyProduct);
      setEditingProductId("");
      setNotice("Product saved. Published stores use this server-side price.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save product.");
    } finally {
      setBusy(false);
    }
  }

  function editProduct(product: Product) {
    setEditingProductId(product.id);
    setProductForm({
      sku: product.sku,
      name: product.name,
      description: product.description,
      image_url: product.image_url,
      price: (product.amount_cents / 100).toFixed(2),
      currency: product.currency,
      requires_shipping: product.requires_shipping,
      active: product.active,
    });
  }

  async function deleteProduct(id: string) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/projects/${projectId}/store-products?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) await readResult(response);
      setProducts((current) => current.filter((product) => product.id !== id));
      if (editingProductId === id) {
        setEditingProductId("");
        setProductForm(emptyProduct);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not remove product.");
    } finally {
      setBusy(false);
    }
  }

  async function setPagePassword(event: FormEvent<HTMLFormElement>, path: string) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await readResult<{ ok: boolean }>(await fetch(`/api/projects/${projectId}/private-pages`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, password: pagePasswords[path] ?? "" }),
      }));
      if (result.ok) {
        setPrivatePages((current) => current.map((page) => page.path === path ? { ...page, passwordConfigured: true } : page));
        setPagePasswords((current) => ({ ...current, [path]: "" }));
        setNotice(`Password saved for ${path}.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save page password.");
    } finally {
      setBusy(false);
    }
  }

  async function loadSubscribers() {
    setBusy(true);
    setError("");
    try {
      const result = await readResult<{ subscribers?: Subscriber[] }>(await fetch(`/api/projects/${projectId}/newsletter`));
      setSubscribers(result.subscribers ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load subscribers.");
    } finally {
      setBusy(false);
    }
  }

  async function downloadSubscribers() {
    setBusy(true);
    setError("");
    try {
      const result = await readResult<{ subscribers?: Subscriber[] }>(await fetch(`/api/projects/${projectId}/newsletter`));
      const rows = [["email", "consent_at", "status", "unsubscribe_url"], ...(result.subscribers ?? []).map((subscriber) => [
        subscriber.email,
        subscriber.consent_at,
        subscriber.unsubscribed_at ? "unsubscribed" : "active",
        subscriber.unsubscribeUrl ?? "",
      ])];
      const blob = new Blob([rows.map((row) => row.map(csvCell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "newsletter-subscribers.csv";
      link.click();
      URL.revokeObjectURL(url);
      setSubscribers(result.subscribers ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not export subscribers.");
    } finally {
      setBusy(false);
    }
  }

  async function loadOrders() {
    setBusy(true);
    setError("");
    try {
      const result = await readResult<{ orders?: Order[] }>(await fetch(`/api/projects/${projectId}/orders`));
      setOrders(result.orders ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load orders.");
    } finally {
      setBusy(false);
    }
  }

  async function saveResendKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!resendKey.trim()) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await readResult<{ configured?: boolean }>(await fetch(`/api/projects/${projectId}/integrations/resend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: resendKey.trim() }),
      }));
      setResendConfigured(true);
      setResendKey("");
      setNotice("Resend key verified and stored encrypted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save Resend key.");
    } finally {
      setBusy(false);
    }
  }

  async function removeResendKey() {
    setBusy(true);
    setError("");
    try {
      await readResult<{ configured?: boolean }>(await fetch(`/api/projects/${projectId}/integrations/resend`, { method: "DELETE" }));
      setResendConfigured(false);
      setNotice("Resend disconnected.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not disconnect Resend.");
    } finally {
      setBusy(false);
    }
  }

  async function sendNewsletter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!publishedSlug || !window.confirm("Send this newsletter to all active subscribers?")) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await readResult<{ sentCount: number; total: number }>(await fetch(`/api/projects/${projectId}/newsletter/campaigns`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: senderEmail, subject: campaignSubject, text: campaignText }),
      }));
      setNotice(`Accepted by Resend: ${result.sentCount} of ${result.total} messages.`);
      setCampaignSubject("");
      setCampaignText("");
      const history = await readResult<{ campaigns?: Campaign[] }>(await fetch(`/api/projects/${projectId}/newsletter/campaigns`));
      setCampaigns(history.campaigns ?? []);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send newsletter. Check campaign history before retrying.");
    } finally {
      setBusy(false);
    }
  }

  const inputClass = "h-10 w-full rounded-md border border-input px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-60";
  const labelClass = "block min-w-0 space-y-1.5 text-sm font-medium";

  return (
    <div className="space-y-8 border-t border-border/70 py-7">
      <section aria-labelledby="services-payments-title" className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="services-payments-title" className="flex items-center gap-2 font-heading text-lg font-semibold"><CreditCard className="h-4 w-4" /> Store payments</h3>
            <p className="mt-1 text-sm text-muted-foreground">Connect a Stripe Express account. Store payments go directly to your connected account.</p>
          </div>
          <span className="text-xs text-muted-foreground">{stripeReady ? "Payments enabled" : stripeConnected ? "Onboarding incomplete" : "Not connected"}</span>
        </div>
        {!stripeConnected && (
          <div className="flex flex-wrap items-end gap-3">
            <label className={`${labelClass} w-44`}>
              <span>Business country</span>
              <select className={inputClass} value={country} onChange={(event) => setCountry(event.target.value)} disabled={busy}>
                {countries.map((code) => <option key={code} value={code}>{code}</option>)}
              </select>
            </label>
            <Button type="button" onClick={() => void connectStripe()} disabled={busy} className="gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />}
              Connect Stripe
            </Button>
          </div>
        )}
        {stripeConnected && !stripeReady && <Button type="button" onClick={() => void connectStripe()} disabled={busy} className="gap-2"><ExternalLink className="h-4 w-4" /> Continue Stripe onboarding</Button>}
        {stripeReady && <p className="flex items-center gap-2 text-sm text-emerald-700"><Check className="h-4 w-4" /> Your store can accept payments.</p>}
      </section>

      <section aria-labelledby="services-products-title" className="space-y-4 border-t border-border/70 pt-6">
        <div>
          <h3 id="services-products-title" className="flex items-center gap-2 font-heading text-lg font-semibold"><Package className="h-4 w-4" /> Product catalog</h3>
          <p className="mt-1 text-sm text-muted-foreground">Published store checkout uses these product prices and shipping settings.</p>
        </div>
        <div className="divide-y divide-border/70">
          {products.map((product) => (
            <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <button type="button" onClick={() => editProduct(product)} className="min-w-0 text-left">
                <span className="block truncate text-sm font-medium">{product.name} <span className="font-normal text-muted-foreground">({product.sku})</span></span>
                <span className="text-xs text-muted-foreground">{(product.amount_cents / 100).toFixed(2)} {product.currency.toUpperCase()} · {product.active ? "Active" : "Hidden"}{product.requires_shipping ? " · Ships to customer" : ""}</span>
              </button>
              <Button type="button" variant="ghost" size="sm" onClick={() => void deleteProduct(product.id)} disabled={busy} aria-label={`Delete ${product.name}`} className="text-destructive"><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          {!products.length && <p className="py-3 text-sm text-muted-foreground">No products yet.</p>}
        </div>
        <form onSubmit={saveProduct} className="grid gap-3 rounded-md border border-border/70 p-4 sm:grid-cols-2">
          <label className={labelClass}>SKU<input className={inputClass} required maxLength={64} value={productForm.sku} onChange={(event) => updateProduct("sku", event.target.value)} disabled={busy} /></label>
          <label className={labelClass}>Product name<input className={inputClass} required maxLength={160} value={productForm.name} onChange={(event) => updateProduct("name", event.target.value)} disabled={busy} /></label>
          <label className={labelClass}>Price<input className={inputClass} required type="number" min="0.01" step="0.01" value={productForm.price} onChange={(event) => updateProduct("price", event.target.value)} disabled={busy} /></label>
          <label className={labelClass}>Currency<input className={inputClass} required minLength={3} maxLength={3} value={productForm.currency} onChange={(event) => updateProduct("currency", event.target.value.toLowerCase())} disabled={busy} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Description<textarea className="w-full rounded-md border border-input px-3 py-2 text-sm" rows={2} maxLength={2000} value={productForm.description} onChange={(event) => updateProduct("description", event.target.value)} disabled={busy} /></label>
          <label className={`${labelClass} sm:col-span-2`}>Image URL<input className={inputClass} type="url" placeholder="https://..." value={productForm.image_url} onChange={(event) => updateProduct("image_url", event.target.value)} disabled={busy} /></label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={productForm.requires_shipping} onChange={(event) => updateProduct("requires_shipping", event.target.checked)} disabled={busy} /> Requires shipping address</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={productForm.active} onChange={(event) => updateProduct("active", event.target.checked)} disabled={busy} /> Available for purchase</label>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit" disabled={busy} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : editingProductId ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}{editingProductId ? "Save product" : "Add product"}</Button>
            {editingProductId && <Button type="button" variant="ghost" onClick={() => { setEditingProductId(""); setProductForm(emptyProduct); }}>Cancel</Button>}
          </div>
        </form>
      </section>

      <section aria-labelledby="services-private-title" className="space-y-4 border-t border-border/70 pt-6">
        <div>
          <h3 id="services-private-title" className="flex items-center gap-2 font-heading text-lg font-semibold"><KeyRound className="h-4 w-4" /> Protected pages</h3>
          <p className="mt-1 text-sm text-muted-foreground">Private page HTML is served only after server-side access checks.</p>
        </div>
        {privatePages.map((page) => (
          <div key={page.path} className="flex flex-wrap items-end gap-3 border-b border-border/50 pb-3">
            <div className="min-w-48 flex-1">
              <p className="text-sm font-medium">{page.title}</p>
              <p className="text-xs text-muted-foreground">{page.path} · {page.access_mode === "members" ? "Visitor account required" : page.passwordConfigured ? "Password set" : "Password not set"}</p>
            </div>
            {page.access_mode === "password" && <form onSubmit={(event) => void setPagePassword(event, page.path)} className="flex w-full gap-2 sm:w-auto">
              <input aria-label={`Password for ${page.path}`} type="password" autoComplete="new-password" minLength={10} maxLength={128} required value={pagePasswords[page.path] ?? ""} onChange={(event) => setPagePasswords((current) => ({ ...current, [page.path]: event.target.value }))} placeholder={page.passwordConfigured ? "Replace password" : "Set page password"} className="h-9 min-w-0 flex-1 rounded-md border border-input px-3 text-sm sm:w-56" disabled={busy} />
              <Button type="submit" size="sm" disabled={busy} aria-label={`Save password for ${page.path}`}><Save className="h-4 w-4" /></Button>
            </form>}
          </div>
        ))}
        {!privatePages.length && <p className="text-sm text-muted-foreground">Ask the builder to create an authenticated or password-protected page.</p>}
      </section>

      <section aria-labelledby="services-audience-title" className="space-y-4 border-t border-border/70 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="services-audience-title" className="flex items-center gap-2 font-heading text-lg font-semibold"><Users className="h-4 w-4" /> Newsletter subscribers</h3>
            <p className="mt-1 text-sm text-muted-foreground">Consent timestamps and unsubscribe links are included in the export.</p>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void loadSubscribers()} disabled={busy}>View list</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => void downloadSubscribers()} disabled={busy} className="gap-2"><Download className="h-4 w-4" /> Export CSV</Button>
          </div>
        </div>
        {subscribers && <p className="text-sm">{subscribers.filter((subscriber) => !subscriber.unsubscribed_at).length} active · {subscribers.length} total subscribers</p>}
        <div className="space-y-3 border-t border-border/50 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Email delivery</p>
              <p className="text-xs text-muted-foreground">Connect Resend with a verified sender domain. Campaigns are limited to 1,000 active subscribers.</p>
            </div>
            <span className="text-xs text-muted-foreground">{resendConfigured ? "Resend connected" : "Not connected"}</span>
          </div>
          {!resendConfigured ? (
            <form onSubmit={saveResendKey} className="flex flex-col gap-2 sm:flex-row">
              <label className="sr-only" htmlFor="resend-api-key">Resend API key</label>
              <input id="resend-api-key" type="password" autoComplete="new-password" value={resendKey} onChange={(event) => setResendKey(event.target.value)} placeholder="Resend API key" className="h-9 min-w-0 flex-1 rounded-md border border-input px-3 text-sm" disabled={busy} />
              <Button type="submit" disabled={busy || !resendKey.trim()} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />} Connect</Button>
            </form>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => void removeResendKey()} disabled={busy}>Disconnect Resend</Button>
          )}
          {resendConfigured && (
            <form onSubmit={sendNewsletter} className="grid gap-3 sm:grid-cols-2">
              <label className={labelClass}>Verified sender email<input className={inputClass} type="email" required maxLength={254} placeholder="newsletter@example.com" value={senderEmail} onChange={(event) => setSenderEmail(event.target.value)} disabled={busy} /></label>
              <label className={labelClass}>Subject<input className={inputClass} required maxLength={180} value={campaignSubject} onChange={(event) => setCampaignSubject(event.target.value)} disabled={busy} /></label>
              <label className={`${labelClass} sm:col-span-2`}>Message<textarea className="w-full rounded-md border border-input px-3 py-2 text-sm" rows={5} required maxLength={30000} value={campaignText} onChange={(event) => setCampaignText(event.target.value)} disabled={busy} /></label>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={busy || !publishedSlug} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ExternalLink className="h-4 w-4" />} Send to active subscribers</Button>
                {!publishedSlug && <p className="mt-2 text-xs text-muted-foreground">Publish the site before sending so recipients have working unsubscribe links.</p>}
              </div>
            </form>
          )}
          {campaigns.length > 0 && <div className="divide-y divide-border/50">{campaigns.slice(0, 5).map((campaign) => <p key={campaign.id} className="py-2 text-xs text-muted-foreground">{campaign.subject} · {campaign.sent_count}/{campaign.recipient_count} · {campaign.status} · {new Date(campaign.created_at).toLocaleDateString()}</p>)}</div>}
        </div>
      </section>

      <section aria-labelledby="services-orders-title" className="space-y-4 border-t border-border/70 pt-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 id="services-orders-title" className="flex items-center gap-2 font-heading text-lg font-semibold"><Package className="h-4 w-4" /> Orders</h3>
            <p className="mt-1 text-sm text-muted-foreground">Only Stripe-confirmed checkout events are recorded as paid orders.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => void loadOrders()} disabled={busy}>Load orders</Button>
        </div>
        {orders?.map((order) => <div key={order.id} className="border-b border-border/50 py-2 text-sm"><div className="flex flex-wrap justify-between gap-2"><span>{order.customer_email || "Guest checkout"} | {order.status}</span><span>{(order.amount_total / 100).toFixed(2)} {order.currency.toUpperCase()} | {new Date(order.created_at).toLocaleDateString()}</span></div><details className="mt-2 text-xs"><summary className="cursor-pointer text-muted-foreground">Items and shipping</summary><pre className="mt-2 max-w-full overflow-x-auto whitespace-pre-wrap">{JSON.stringify({ items: order.items, shipping: order.shipping_address }, null, 2)}</pre></details></div>)}
        {orders && !orders.length && <p className="text-sm text-muted-foreground">No orders recorded yet.</p>}
      </section>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="text-sm text-emerald-700">{notice}</p>}
    </div>
  );
}