import { useState } from "react";
import { FileText, Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useInstructionsApi, Instruction, CreateInstructionRequest } from "@/lib/instructionsApi";
import { useEffect } from "react";
import { useOrgScope } from "@/context/OrgScopeContext";
import { useOrgScopedToast } from "@/lib/orgScopedToast";

export default function LLMInstructions() {
  const { instructions, create, update, remove, toggleActive, refresh } = useInstructionsApi();
  const { activeOrgId, activeOrg } = useOrgScope();
  useEffect(() => { if (activeOrgId) refresh(); }, [activeOrgId, refresh]);
  const { toast } = useToast();
  const { toastError } = useOrgScopedToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Instruction | null>(null);
  const [form, setForm] = useState<CreateInstructionRequest>({
    title: "",
    content: "",
    priority: 1,
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  // Defensive client-side scope filter: never show instructions whose orgId is
  // set but doesn't match the active org. (The backend should already filter
  // by X-Active-Org; this guards against misconfigurations.)
  const visibleInstructions = instructions.filter(
    (i) => i.orgId == null || i.orgId === activeOrgId
  );

  const openCreate = () => {
    setEditing(null);
    setForm({ title: "", content: "", priority: instructions.length + 1, isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (inst: Instruction) => {
    setEditing(inst);
    setForm({ title: inst.title, content: inst.content, priority: inst.priority, isActive: inst.isActive });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) {
      toast({ title: "Validation Error", description: "Title and content are required.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await update(editing.id, form);
        toast({ title: "Instruction Updated" });
      } else {
        await create(form);
        toast({ title: "Instruction Created" });
      }
      setDialogOpen(false);
    } catch (err) {
      toastError(editing ? "update this instruction" : "create the instruction", err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await remove(id);
      toast({ title: "Instruction Deleted" });
    } catch (err) {
      toastError("delete this instruction", err);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      const updated = await toggleActive(id);
      toast({ title: updated.isActive ? "Instruction Activated" : "Instruction Deactivated" });
    } catch (err) {
      toastError("toggle this instruction", err);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="h-6 w-6" /> LLM Instructions
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeOrg
              ? `Instructions for ${activeOrg.name} — applied to that organization's LLM sessions.`
              : "Instructions applied to LLM sessions."}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" /> Add Instruction
        </Button>
      </div>

      {visibleInstructions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No instructions yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Add instructions to guide the LLM for {activeOrg?.name ?? "this organization"}.
            </p>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" /> Create First Instruction
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleInstructions.map((inst) => (
            <Card key={inst.id} className="group">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    {inst.title}
                    <Badge variant={inst.isActive ? "default" : "outline"} className="text-xs">
                      {inst.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Priority: {inst.priority} · Updated {new Date(inst.updatedAt).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={inst.isActive}
                    onCheckedChange={() => handleToggle(inst.id)}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(inst)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete instruction?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently remove "{inst.title}" from all user sessions.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(inst.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground line-clamp-2">{inst.content}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Instruction" : "New Instruction"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Instruction title"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea
                placeholder="Write the instruction content..."
                rows={5}
                value={form.content}
                onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex-1">
                <label className="text-sm font-medium">Priority</label>
                <Input
                  type="number"
                  min={1}
                  value={form.priority}
                  onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value) || 1 }))}
                />
              </div>
              <div className="flex items-end gap-2 pb-0.5">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, isActive: checked }))}
                />
                <label className="text-sm">Active</label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
