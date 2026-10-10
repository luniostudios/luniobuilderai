"use client";

import { useState } from "react";
import { Database, FilePlus2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EMPTY_CMS_DATA, normalizeCmsData, type CmsData, type CmsField } from "@/lib/cms";

type Props = {
  value: unknown;
  onSave: (data: CmsData) => Promise<string | null>;
};

function slugify(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 40) || "field";
}

export default function CmsManager({ value, onSave }: Props) {
  const [data, setData] = useState<CmsData>(() => normalizeCmsData(value) ?? EMPTY_CMS_DATA);
  const [selectedId, setSelectedId] = useState(data.collections[0]?.id ?? "");
  const [collectionName, setCollectionName] = useState("");
  const [fieldDefinitions, setFieldDefinitions] = useState("Title:text, Description:text, Image:image, Link:url");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [saveError, setSaveError] = useState("");

  const selected = data.collections.find((collection) => collection.id === selectedId) ?? null;

  function addCollection() {
    const name = collectionName.trim();
    if (!name) return;
    const fields: CmsField[] = fieldDefinitions.split(",").map((definition) => {
      const [labelPart, typePart] = definition.split(":").map((part) => part.trim());
      const type = ["text", "image", "url", "date"].includes(typePart) ? typePart as CmsField["type"] : "text";
      return { key: slugify(labelPart), label: labelPart || "Field", type };
    }).filter((field, index, all) => field.label && all.findIndex((candidate) => candidate.key === field.key) === index).slice(0, 20);
    const collection = { id: crypto.randomUUID(), name, fields, items: [] };
    setData((current) => ({ collections: [...current.collections, collection] }));
    setSelectedId(collection.id);
    setCollectionName("");
    setNotice("");
  }

  function updateCollection(collectionId: string, update: (collection: CmsData["collections"][number]) => CmsData["collections"][number]) {
    setData((current) => ({ collections: current.collections.map((collection) => collection.id === collectionId ? update(collection) : collection) }));
    setNotice("");
  }

  function addItem() {
    if (!selected) return;
    const values = Object.fromEntries(selected.fields.map((field) => [field.key, ""]));
    updateCollection(selected.id, (collection) => ({
      ...collection,
      items: [...collection.items, { id: crypto.randomUUID(), values }],
    }));
  }

  async function save() {
    setSaving(true);
    setSaveError("");
    setNotice("");
    const error = await onSave(data);
    if (error) setSaveError(error);
    else setNotice("CMS changes saved");
    setSaving(false);
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
      <div className="mx-auto w-full max-w-5xl px-5 py-7 sm:px-8">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 pb-5">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-emerald-600/10 text-emerald-700">
              <Database className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-heading text-xl font-semibold">Content collections</h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">Manage the content your generated website uses. Ask the builder to create a CMS for a blog, menu, team, or other repeatable content.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {notice && <span role="status" className="text-xs text-emerald-700">{notice}</span>}
            <Button onClick={() => void save()} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save changes"}
            </Button>
          </div>
        </div>

        {saveError && <p role="alert" className="mt-4 text-sm text-destructive">{saveError}</p>}

        <div className="grid min-h-104 grid-cols-1 gap-7 py-6 md:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-4 border-b border-border/70 pb-5 md:border-b-0 md:border-r md:pb-0 md:pr-5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Collections</h3>
              <span className="text-xs tabular-nums text-muted-foreground">{data.collections.length}</span>
            </div>
            {data.collections.map((collection) => (
              <button
                key={collection.id}
                type="button"
                onClick={() => setSelectedId(collection.id)}
                className={`flex min-h-10 w-full items-center justify-between gap-2 border-l-2 px-3 text-left text-sm ${selectedId === collection.id ? "border-emerald-700 bg-emerald-700/5 font-medium text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}
              >
                <span className="truncate">{collection.name}</span>
                <span className="text-xs tabular-nums">{collection.items.length}</span>
              </button>
            ))}
            <div className="space-y-2 border-t border-border/70 pt-4">
              <label className="block text-xs font-medium" htmlFor="new-collection-name">New collection</label>
              <input id="new-collection-name" value={collectionName} onChange={(event) => setCollectionName(event.target.value)} placeholder="e.g. Journal" className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <label className="block text-xs font-medium" htmlFor="new-collection-fields">Fields</label>
              <input id="new-collection-fields" value={fieldDefinitions} onChange={(event) => setFieldDefinitions(event.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              <p className="text-[11px] leading-relaxed text-muted-foreground">Separate fields with commas. Optional types: text, image, url, date.</p>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={addCollection} disabled={!collectionName.trim()}>
                <Plus className="h-4 w-4" /> Add collection
              </Button>
            </div>
          </aside>

          {selected ? (
            <div className="min-w-0">
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-heading text-lg font-semibold">{selected.name}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{selected.items.length} {selected.items.length === 1 ? "record" : "records"} · {selected.fields.length} fields</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="gap-2" onClick={addItem}>
                    <FilePlus2 className="h-4 w-4" /> Add record
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Delete ${selected.name} collection`}
                    title="Delete collection"
                    onClick={() => {
                      const remaining = data.collections.filter((collection) => collection.id !== selected.id);
                      setData({ collections: remaining });
                      setSelectedId(remaining[0]?.id ?? "");
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {selected.items.length ? (
                <div className="space-y-4">
                  {selected.items.map((item, index) => (
                    <article key={item.id} className="border border-border/80 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Record {index + 1}</h4>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete record ${index + 1}`}
                          title="Delete record"
                          onClick={() => updateCollection(selected.id, (collection) => ({ ...collection, items: collection.items.filter((entry) => entry.id !== item.id) }))}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {selected.fields.map((field) => (
                          <label key={field.key} className="block min-w-0 space-y-1.5">
                            <span className="text-xs font-medium">{field.label}</span>
                            <input
                              type={field.type === "date" ? "date" : field.type === "url" || field.type === "image" ? "url" : "text"}
                              value={item.values[field.key] ?? ""}
                              onChange={(event) => updateCollection(selected.id, (collection) => ({
                                ...collection,
                                items: collection.items.map((entry) => entry.id === item.id
                                  ? { ...entry, values: { ...entry.values, [field.key]: event.target.value } }
                                  : entry),
                              }))}
                              placeholder={field.type === "image" ? "https://..." : field.label}
                              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            />
                          </label>
                        ))}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center border border-dashed border-border px-6 text-center">
                  <FilePlus2 className="mb-3 h-5 w-5 text-muted-foreground" />
                  <p className="text-sm font-medium">No records yet</p>
                  <p className="mt-1 text-xs text-muted-foreground">Add the first record to this collection.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex min-h-64 flex-col items-center justify-center px-4 text-center">
              <Database className="mb-3 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">Your content starts here</p>
              <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Create a collection, or ask the builder to generate a site with CMS-managed content.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}