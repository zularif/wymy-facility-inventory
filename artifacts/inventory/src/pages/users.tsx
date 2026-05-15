import { useListProfiles, useUpdateProfile, ProfileUpdateRole, ProfileUpdateStatus } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export function Users() {
  const { data: profiles, isLoading, refetch } = useListProfiles();
  const updateProfile = useUpdateProfile();
  const { toast } = useToast();

  const handleRoleChange = async (id: number, role: ProfileUpdateRole) => {
    try {
      await updateProfile.mutateAsync({ id, data: { role } });
      toast({ title: "Role updated" });
      refetch();
    } catch (error) {
      toast({ title: "Failed to update role", variant: "destructive" });
    }
  };

  const handleStatusChange = async (id: number, status: ProfileUpdateStatus) => {
    try {
      await updateProfile.mutateAsync({ id, data: { status } });
      toast({ title: "Status updated" });
      refetch();
    } catch (error) {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  if (isLoading) return <div className="p-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">User Management</h1>
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles?.map((profile) => (
              <TableRow key={profile.id}>
                <TableCell>{profile.email}</TableCell>
                <TableCell>{profile.full_name || "-"}</TableCell>
                <TableCell>
                  <Select value={profile.role} onValueChange={(val: any) => handleRoleChange(profile.id, val)}>
                    <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="storekeeper">Storekeeper</SelectItem>
                      <SelectItem value="technician">Technician</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Select value={profile.status} onValueChange={(val: any) => handleStatusChange(profile.id, val)}>
                    <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>{new Date(profile.created_at).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
