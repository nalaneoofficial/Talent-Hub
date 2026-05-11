import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Plus, Loader2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

type Row = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  current_location: string | null;
  highest_education: string | null;
  years_experience: number | null;
  created_at: string;
  subscription_status: string;
  subscription_expires_at: string | null;
  account_type: string | null;
};

type Role = "user" | "partner" | "admin" | "employer" | "quick_jobs";

const AdminUsers = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [roles, setRoles] = useState<Record<string, Role>>({});
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);

  // Add User State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [addForm, setAddForm] = useState({ email: "", password: "", fullName: "", role: "user" as Role });
  const [isAdding, setIsAdding] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const [{ data: profs }, { data: rs }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id,full_name,email,phone,current_location,highest_education,years_experience,created_at,subscription_status,subscription_expires_at,account_type")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("user_roles").select("user_id,role"),
    ]);
    const map: Record<string, Role> = {};
    for (const r of (rs ?? []) as any[]) map[r.user_id] = r.role as Role;
    setRoles(map);
    setRows((profs ?? []) as Row[]);
    setLoading(false);
  };

  useEffect(() => { loadData(); }, []);

  const changeRole = async (userId: string, newRole: Role) => {
    const prev = roles[userId];
    setRoles((p) => ({ ...p, [userId]: newRole }));

    // Determine the account_type value to write to profiles
    const accountTypeMap: Record<Role, string> = {
      employer: "employer",
      quick_jobs: "quick_jobs",
      user: "user",
      partner: "user",
      admin: "user",
    };
    await supabase.from("profiles").update({ account_type: accountTypeMap[newRole] }).eq("id", userId);

    // user_roles table only tracks admin/partner — employer & quick_jobs live on profiles.account_type
    const rolesTableRole = (newRole === "employer" || newRole === "quick_jobs") ? null : newRole;
    if (rolesTableRole) {
      const { error } = await supabase
        .from("user_roles")
        .upsert({ user_id: userId, role: rolesTableRole }, { onConflict: "user_id" });
      if (error) {
        setRoles((p) => ({ ...p, [userId]: prev ?? "user" }));
        toast.error(error.message);
        return;
      }
    } else {
      // If the new role doesn't use user_roles, delete any existing row so there's no stale partner/admin entry
      await supabase.from("user_roles").delete().eq("user_id", userId);
    }

    toast.success(`Role updated to ${newRole}`);
    loadData();
  };

  const toggleSubscription = async (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    const { error } = await supabase.from("profiles").update({ 
      subscription_status: newStatus,
      subscription_expires_at: newStatus === "active" ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() : null
    }).eq("id", userId);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Subscription set to ${newStatus}`);
      loadData();
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: addForm.email,
        password: addForm.password,
        options: {
          data: {
            full_name: addForm.fullName,
          }
        }
      });
      if (error) throw error;
      
      const userId = data.user?.id;
      if (userId) {
        if (addForm.role === "employer" || addForm.role === "quick_jobs") {
          await supabase.from("profiles").update({ account_type: addForm.role }).eq("id", userId);
        } else {
          await supabase.from("user_roles").insert({ user_id: userId, role: addForm.role });
        }
      }
      
      toast.success("User added successfully!");
      setIsAddOpen(false);
      setAddForm({ email: "", password: "", fullName: "", role: "user" });
      loadData();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const filtered = rows.filter((r) => {
    if (!q.trim()) return true;
    const s = q.toLowerCase();
    return (r.full_name ?? "").toLowerCase().includes(s)
      || (r.email ?? "").toLowerCase().includes(s)
      || (r.current_location ?? "").toLowerCase().includes(s);
  });

  const badgeColor = (role: Role) =>
    role === "admin" ? "bg-destructive/15 text-destructive"
    : role === "partner" ? "bg-primary/15 text-primary"
    : role === "employer" ? "bg-blue-500/15 text-blue-500"
    : "bg-secondary text-muted-foreground";

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Users</h1>
          <p className="text-sm text-muted-foreground">{rows.length} registered candidates.</p>
        </div>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="w-4 h-4"/> Add User</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddUser} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input required value={addForm.fullName} onChange={(e) => setAddForm(p => ({...p, fullName: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" required value={addForm.email} onChange={(e) => setAddForm(p => ({...p, email: e.target.value}))} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" required value={addForm.password} onChange={(e) => setAddForm(p => ({...p, password: e.target.value}))} minLength={6} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={addForm.role} onValueChange={(v) => setAddForm(p => ({...p, role: v as Role}))}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="employer">Employer</SelectItem>
                    <SelectItem value="quick_jobs">Job Poster</SelectItem>
                    <SelectItem value="partner">Partner</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={isAdding}>
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Create User
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4 relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, email, location"
          className="w-full pl-9 pr-3 py-2 rounded-xl bg-card border border-border text-sm"
        />
      </div>

      <div className="mt-4 bg-card rounded-2xl border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary text-muted-foreground text-xs uppercase whitespace-nowrap">
              <tr>
                <th className="text-left p-3">Name</th>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Account</th>
                <th className="text-left p-3">Subscription</th>
                <th className="text-left p-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">Loading…</td></tr>}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No users match.</td></tr>
              )}
              {filtered.map((r) => {
                const role = r.account_type === 'employer' ? 'employer' : r.account_type === 'quick_jobs' ? 'quick_jobs' : (roles[r.id] ?? "user");
                return (
                  <tr key={r.id} className="border-t border-border">
                    <td className="p-3 font-medium">
                      <div className="flex flex-col">
                        <span>{r.full_name ?? "—"}</span>
                        <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{r.email ?? "—"}</td>
                    <td className="p-3">
                      {r.account_type === 'quick_jobs' && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-yellow-500/15 text-yellow-600">Quick Jobs Only</span>
                      )}
                      {r.account_type !== 'quick_jobs' && (
                        <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-semibold bg-secondary text-muted-foreground">{r.account_type || 'user'}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${r.subscription_status === 'active' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className="text-xs uppercase font-medium">{r.subscription_status}</span>
                        <Button variant="outline" size="sm" className="h-6 text-xs ml-2" onClick={() => toggleSubscription(r.id, r.subscription_status)}>
                          {r.subscription_status === 'active' ? 'Deactivate' : 'Activate'}
                        </Button>
                      </div>
                      {r.subscription_expires_at && (
                        <p className="text-[10px] text-muted-foreground mt-1">Expires: {new Date(r.subscription_expires_at).toLocaleDateString()}</p>
                      )}
                    </td>
                    <td className="p-3">
                      <Select value={role} onValueChange={(v) => changeRole(r.id, v as Role)}>
                        <SelectTrigger className="w-32 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="employer">Employer</SelectItem>
                          <SelectItem value="quick_jobs">Job Poster</SelectItem>
                          <SelectItem value="partner">Partner</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
