import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function ChangePasswordDialog({ open, onClose }: Props) {
  const { toast } = useToast();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  const reset = () => { setCurrent(""); setNext(""); setConfirm(""); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }
    if (next.length < 6) {
      toast({ title: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/profiles/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ current_password: current, new_password: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to update password");
      toast({ title: "Password changed successfully" });
      reset();
      onClose();
    } catch (err: any) {
      toast({ title: err.message ?? "Error", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Password</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-1">
            <Label>Current Password</Label>
            <Input type="password" autoComplete="current-password" value={current} onChange={e => setCurrent(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>New Password</Label>
            <Input type="password" autoComplete="new-password" value={next} onChange={e => setNext(e.target.value)} required />
          </div>
          <div className="space-y-1">
            <Label>Confirm New Password</Label>
            <Input type="password" autoComplete="new-password" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => { reset(); onClose(); }}>Cancel</Button>
            <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Change Password"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
