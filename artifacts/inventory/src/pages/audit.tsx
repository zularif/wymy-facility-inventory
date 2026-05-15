import { useState } from "react";
import { useListAuditLog } from "@workspace/api-client-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";

export function AuditLog() {
  const [userId, setUserId] = useState("");
  const { data: logs, isLoading } = useListAuditLog({ user_id: userId || undefined });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Audit Log</h1>
      </div>

      <div className="flex gap-4 mb-4">
        <Input 
          placeholder="Filter by User ID..." 
          className="max-w-sm" 
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
      </div>

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Time</TableHead>
              <TableHead>User Email</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Table</TableHead>
              <TableHead>Record ID</TableHead>
              <TableHead>Description</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center">Loading...</TableCell></TableRow>
            ) : logs?.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground">No logs found</TableCell></TableRow>
            ) : logs?.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="text-sm whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell>{log.user_email || log.user_id}</TableCell>
                <TableCell><span className="font-mono bg-muted px-1 py-0.5 rounded text-xs">{log.action}</span></TableCell>
                <TableCell>{log.table_name || "-"}</TableCell>
                <TableCell>{log.record_id || "-"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{log.description}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
