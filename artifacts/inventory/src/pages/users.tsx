import { useState } from "react";
import { useListProfiles } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, UserPlus } from "lucide-react";
import type { Profile } from "@workspace/api-client-react";

const ROLES = ["admin", "storekeeper", "technician", "viewer"] as const;
const STATUSES = ["active", "inactive"] as const;

function roleBadge(role: string) {
  const colors: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    storekeeper: "bg-blue-100 text-blue-700",
    technician: "bg-yellow-100 text-yellow-700",
    viewer: "bg-gray-100 text-gray-700",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${colors[role] ?? "bg-gray-100"}`}>{role}</span>;
}

interface UserFormData {
  full_name: string;
  email: string;
  role: string;
  status: string;
  new_password: string;
}

const emptyForm: UserFormData = { full_name: "", email: "", role: "storekeeper", status: "active", new_password: "" };

export function Users() {
  const { data: profiles, isLoading, refetch } = useListProfiles();
  const { toast } = useToast();

  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Profile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Profile | null>(null);
  const [form, setForm] = useState<UserFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const setField = (k: keyof UserFormData, v: string) => setForm(f => ({ ...f, [k]: v }));

  const openAdd = () => { setForm(emptyForm); setAddOpen(true); };
  const openEdit = (p: Profile) => {
    setForm({ full_name: p.full_name ?? "", email: p.email, role: p.role, status: p.status, new_password: "" });
    setEditTarget(p);
  };

  const handleSaveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.new_password) { toast({ title: "Password is required", variant: "destructive" }); return; }
    if (form.new_password.length < 6) { toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ full_name: form.full_name, email: form.email, password: form.new_password, role: form.role, status: form.status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create user");
      toast({ title: "User created successfully" });
      setAddOpen(false);
      refetch();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (form.new_password && form.new_password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      const body: Record<string, string> = { full_name: form.full_name, email: form.email, role: form.role, status: form.status };
      if (form.new_password) body.new_password = form.new_password;
      const res = await fetch(`/api/profiles/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update user");
      toast({ title: "User updated successfully" });
      setEditTarget(null);
      refetch();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/profiles/${deleteTarget.id}`, { method: "DELETE", credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to delete user");
      toast({ title: "User deleted" });
      setDeleteTarget(null);
      refetch();
    } catch (err: any) {
      toast({ title: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  if (isLoading) return <div className="p-8 text-sm text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">User Management</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage accounts, roles, and passwords</p>
        </div>
        <Button onClick={openAdd}><UserPlus className="w-4 h-4 mr-2" />Add User</Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles?.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">{p.full_name || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{p.email}</TableCell>
                <TableCell>{roleBadge(p.role)}</TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "default" : "secondary"} className="capitalize">
                    {p.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(p)} title="Edit user">
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => setDeleteTarget(p)} title="Delete user">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Add New User</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveNew} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={e => setField("full_name", e.target.value)} placeholder="John Smith" required />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} placeholder="john@example.com" required />
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input type="password" autoComplete="new-password" value={form.new_password} onChange={e => setField("new_password", e.target.value)} placeholder="Min. 6 characters" required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setField("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Creating..." : "Create User"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editTarget} onOpenChange={o => { if (!o) setEditTarget(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input value={form.full_name} onChange={e => setField("full_name", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={e => setField("email", e.target.value)} required />
            </div>
            <div className="space-y-1">
              <Label>New Password <span className="text-muted-foreground text-xs">(leave blank to keep current)</span></Label>
              <Input type="password" autoComplete="new-password" value={form.new_password} onChange={e => setField("new_password", e.target.value)} placeholder="Enter to reset password" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={v => setField("role", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ROLES.map(r => <SelectItem key={r} value={r} className="capitalize">{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={v => setField("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
              <Button type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <span className="font-medium text-foreground">{deleteTarget?.full_name || deleteTarget?.email}</span>? This cannot be undone.
          </p>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>{deleting ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
