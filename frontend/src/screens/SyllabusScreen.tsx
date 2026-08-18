import { useEffect, useState } from "react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { InboxSkeleton } from "@/components/states/InboxSkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiBlob } from "@/lib/api";
import type { Pole, SyllabusDoc } from "@/lib/types";
import { POLES } from "@/lib/types";
import { formatSize, timeAgo } from "@/lib/utils";
import { useStore } from "@/store";
import { BookOpen } from "lucide-react";

export function SyllabusScreen() {
  const { user, syllabus, uploadSyllabus, deleteSyllabus } = useStore();
  const [docs, setDocs] = useState<SyllabusDoc[] | null>(null);
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState("recent");
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [poles, setPoles] = useState<Pole[]>(user?.pole ? [user.pole] : []);
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [dropId, setDropId] = useState<string | null>(null);
  const canPost = user && (user.role === "PROF" || user.role === "RELAIS" || user.role === "ADMIN");

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(q), 300);
    return () => window.clearTimeout(id);
  }, [q]);

  const reload = () =>
    void syllabus(debounced, sort)
      .then((d) => {
        setDocs(d);
        setLoadErr(null);
      })
      .catch((e) => setLoadErr(e?.message || "Erreur"));

  useEffect(() => {
    reload();
  }, [debounced, sort]);

  const openDoc = async (doc: SyllabusDoc) => {
    const blob = await apiBlob(`/api/syllabus/${doc.id}/file`);
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  };

  return (
    <>
      <PageHeader
        title="Syllabus"
        actions={
          canPost ? (
            <Button onClick={() => setOpen(true)}>Déposer</Button>
          ) : undefined
        }
      />
      <div className="mb-4 rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm text-muted-foreground">
        <BookOpen className="mr-2 inline h-4 w-4 text-primary" />
        Programmes, fiches de TP et guides — recherche insensible aux accents.
      </div>
      <Input placeholder="Rechercher un document…" value={q} onChange={(e) => setQ(e.target.value)} className="mb-3 h-11" />
      <div className="mb-4 flex flex-wrap gap-2">
        {[
          ["recent", "Plus récents"],
          ["old", "Plus anciens"],
          ["title", "Titre A→Z"],
          ["discipline", "Matière"],
        ].map(([id, label]) => (
          <button key={id} className={`h-9 rounded-full border px-3 text-sm ${sort === id ? "border-primary text-primary" : "border-border"}`} onClick={() => setSort(id)}>
            {label}
          </button>
        ))}
      </div>
      {loadErr && <ErrorState title="Impossible de charger" description={loadErr} onRetry={reload} />}
      {docs === null && !loadErr && <InboxSkeleton rows={4} />}
      {docs && docs.length === 0 && (
        <EmptyState
          icon={BookOpen}
          title={debounced ? "Aucun résultat" : "Bibliothèque vide"}
          description={debounced ? "Aucun document ne correspond à cette recherche." : "Aucun syllabus n’a encore été déposé."}
        />
      )}
      <div className="space-y-3">
        {(docs || []).map((doc) => (
          <Card key={doc.id} className="p-4">
            <div className="font-bold">{doc.title}</div>
            <div className="text-xs text-muted-foreground">
              {doc.author?.name} · {timeAgo(doc.createdAt)}
            </div>
            {doc.description && <p className="mt-2 text-sm text-muted-foreground">{doc.description}</p>}
            <div className="mt-2 flex flex-wrap gap-1 text-xs">
              {doc.discipline && <span className="rounded-full border border-border px-2 py-0.5">{doc.discipline}</span>}
              {doc.poles.map((p) => (
                <span key={p} className="rounded-full border border-border px-2 py-0.5">
                  {p}
                </span>
              ))}
              <span className="text-muted-foreground">
                {doc.fileName} · {formatSize(doc.fileSize)}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <Button size="sm" onClick={() => void openDoc(doc)}>
                Ouvrir le document
              </Button>
              {doc.canDelete && (
                <Button size="sm" variant="outline" onClick={() => setDropId(doc.id)}>
                  Supprimer
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Déposer un document</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!file) return;
              const form = new FormData();
              form.append("title", title);
              form.append("description", description);
              form.append("poles", JSON.stringify(poles));
              form.append("file", file);
              const e2 = await uploadSyllabus(form);
              setErr(e2);
              if (!e2) {
                setOpen(false);
                setTitle("");
                setFile(null);
                reload();
              }
            }}
          >
            <Label>Titre *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex flex-wrap gap-2">
              {POLES.map((p) => (
                <button
                  type="button"
                  key={p}
                  className={`rounded-full border px-3 py-1 text-sm ${poles.includes(p) ? "border-primary text-primary" : "border-border"}`}
                  onClick={() => setPoles((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]))}
                >
                  {p}
                </button>
              ))}
            </div>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            {err && <p className="text-sm text-destructive">{err}</p>}
            <Button type="submit" className="w-full" disabled={!file}>
              Déposer
            </Button>
          </form>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!dropId}
        title="Supprimer ce document ?"
        onOpenChange={(o) => !o && setDropId(null)}
        onConfirm={() => {
          if (dropId) void deleteSyllabus(dropId).then(reload);
        }}
      />
    </>
  );
}
