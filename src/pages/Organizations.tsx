import { useState, useEffect } from "react";
import { useRoles, ROLES } from "@/auth/useRoles";
import { useOrgScope } from "@/context/OrgScopeContext";
import { Building2, Search, MoreHorizontal, Users, CreditCard, Mail, Calendar, ArrowUpDown, Eye, Ban, CheckCircle2, UserPlus, Trash2, X, Send, Loader2, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useOrganizationsApi, Organization, OrganizationDetail, Member } from "@/lib/organizationsApi";

const tierColors: Record<string, "secondary" | "outline" | "default" | "destructive"> = {
  internal: "secondary",
  free: "outline",
  personal: "outline",
  company: "secondary",
  enterprise: "default",
};

const statusColors: Record<string, "secondary" | "outline" | "destructive"> = {
  active: "secondary",
  suspended: "destructive",
  trial: "outline",
};

const roleColors: Record<string, "default" | "secondary" | "outline"> = {
  owner: "default",
  admin: "secondary",
  member: "outline",
};

type SortField = "name" | "createdAt" | "memberCount" | "monthlySpend";

function avatarInitials(userId: string): string {
  if (userId.includes("@")) return userId[0].toUpperCase();
  return userId.substring(0, 2).toUpperCase();
}

export default function Organizations() {
  const { hasAnyRole, hasRole } = useRoles();
  const isBoucStaff = hasAnyRole(ROLES.BOUC_ADMIN, ROLES.BOUC_SRE, ROLES.BOUC_ENGINEER);
  const isOrgAdminOnly =
    !isBoucStaff && (hasRole(ROLES.ORG_ADMIN) || hasRole(ROLES.ORG_ADMIN_ENTERPRISE));
  const { activeOrgId, activeOrg } = useOrgScope();

  const {
    organizations,
    loading,
    fetchOrganization,
    createOrganization,
    updateOrganization,
    deleteOrganization,
    addMember,
    removeMember,
  } = useOrganizationsApi();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tierFilter, setTierFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortAsc, setSortAsc] = useState(true);

  // Detail modal
  const [selectedOrgId, setSelectedOrgId] = useState<string | null>(null);
  const [detailOrg, setDetailOrg] = useState<OrganizationDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  // Invite member
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<"owner" | "admin" | "member">("member");
  const [inviting, setInviting] = useState(false);

  // New org dialog
  const [newOrgOpen, setNewOrgOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgSlug, setNewOrgSlug] = useState("");
  const [newOrgTier, setNewOrgTier] = useState("free");
  const [creating, setCreating] = useState(false);

  const { toast } = useToast();

  // Org-admin-only: auto-load the user's own org detail and skip the staff list.
  useEffect(() => {
    if (!isOrgAdminOnly || !activeOrgId) return;
    let cancelled = false;
    setDetailLoading(true);
    fetchOrganization(activeOrgId)
      .then((detail) => { if (!cancelled) setDetailOrg(detail); })
      .catch(() => { if (!cancelled) toast({ title: "Failed to load your organization", variant: "destructive" }); })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [isOrgAdminOnly, activeOrgId, fetchOrganization, toast]);

  const selectedOrg: Organization | undefined = isOrgAdminOnly
    ? (detailOrg ?? undefined)
    : organizations.find((o) => o.id === selectedOrgId);

  const filtered = organizations
    .filter((o) => {
      const q = search.toLowerCase();
      const matchesSearch = !q || o.name.toLowerCase().includes(q) || o.slug.includes(q);
      const matchesStatus = statusFilter === "all" || o.status === statusFilter;
      const matchesTier = tierFilter === "all" || o.tier === tierFilter;
      return matchesSearch && matchesStatus && matchesTier;
    })
    .sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortField === "name") return a.name.localeCompare(b.name) * dir;
      if (sortField === "createdAt") return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
      if (sortField === "memberCount") return (a.memberCount - b.memberCount) * dir;
      if (sortField === "monthlySpend") return (a.monthlySpend - b.monthlySpend) * dir;
      return 0;
    });

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(true); }
  };

  const totalMembers = organizations.reduce((s, o) => s + o.memberCount, 0);
  const totalSpend = organizations.reduce((s, o) => s + o.monthlySpend, 0);

  const openDetail = async (org: Organization) => {
    setSelectedOrgId(org.id);
    setDetailOpen(true);
    setAddMemberOpen(false);
    setDetailLoading(true);
    try {
      const detail = await fetchOrganization(org.id);
      setDetailOrg(detail);
    } catch {
      toast({ title: "Failed to load details", variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleSuspend = async (org: Organization) => {
    try {
      await updateOrganization(org.id, { status: "suspended" });
      toast({ title: "Organization suspended", description: `${org.name} has been suspended.` });
    } catch {
      toast({ title: "Failed to suspend", variant: "destructive" });
    }
  };

  const handleReactivate = async (org: Organization) => {
    try {
      await updateOrganization(org.id, { status: "active" });
      toast({ title: "Organization reactivated", description: `${org.name} has been reactivated.` });
    } catch {
      toast({ title: "Failed to reactivate", variant: "destructive" });
    }
  };

  const handleSendInvitation = async () => {
    if (!detailOrg || !newMemberEmail.trim()) return;
    setInviting(true);
    try {
      await addMember(detailOrg.id, { email: newMemberEmail.trim(), role: newMemberRole });
      const updated = await fetchOrganization(detailOrg.id);
      setDetailOrg(updated);
      setNewMemberEmail("");
      setNewMemberRole("member");
      setAddMemberOpen(false);
      toast({ title: "Member added", description: `${newMemberEmail.trim()} has been added to ${detailOrg.name}.` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to add member";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (member: Member) => {
    if (!detailOrg) return;
    try {
      await removeMember(detailOrg.id, member.id);
      setDetailOrg((prev) => prev ? { ...prev, members: prev.members.filter((m) => m.id !== member.id) } : prev);
      toast({ title: "Member removed", description: `${member.userId} has been removed from ${detailOrg.name}.` });
    } catch {
      toast({ title: "Failed to remove member", variant: "destructive" });
    }
  };

  const handleCreateOrg = async () => {
    if (!newOrgName.trim() || !newOrgSlug.trim()) return;
    setCreating(true);
    try {
      await createOrganization({ name: newOrgName.trim(), slug: newOrgSlug.trim(), tier: newOrgTier });
      setNewOrgName("");
      setNewOrgSlug("");
      setNewOrgTier("free");
      setNewOrgOpen(false);
      toast({ title: "Organization created", description: `${newOrgName.trim()} has been created.` });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message || "Failed to create organization";
      toast({ title: "Error", description: msg, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  // Scoped view for org admins (no BoucIO staff role): only their own org.
  if (isOrgAdminOnly) {
    return (
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Building2 className="h-6 w-6" /> {activeOrg?.name ?? "Your Organization"}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage members, billing, and SSO for your organization.
          </p>
        </div>

        {detailLoading || !detailOrg ? (
          <Card>
            <CardContent className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-6">
              <Tabs defaultValue="details">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="members" className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> Members ({detailOrg.members.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Slug</Label>
                      <p className="text-sm font-medium">{detailOrg.slug}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div><Badge variant={statusColors[detailOrg.status] ?? "outline"}>{detailOrg.status}</Badge></div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tier</Label>
                      <div><Badge variant={tierColors[detailOrg.tier] ?? "outline"}>{detailOrg.tier}</Badge></div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Members</Label>
                      <p className="text-sm font-medium">{detailOrg.memberCount} / {detailOrg.maxSeats}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> Monthly</Label>
                      <p className="text-sm font-medium">${detailOrg.monthlySpend.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Created</Label>
                      <p className="text-sm font-medium">{new Date(detailOrg.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="members" className="space-y-4 mt-4">
                  {addMemberOpen ? (
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Mail className="h-4 w-4" /> Invite by Email
                          </h4>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddMemberOpen(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div>
                          <Label className="text-xs">Email Address</Label>
                          <Input type="email" placeholder="colleague@company.com" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} className="mt-1" />
                        </div>
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <Label className="text-xs">Role</Label>
                            <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as "owner" | "admin" | "member")}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button size="sm" onClick={handleSendInvitation} disabled={!newMemberEmail.trim() || inviting}>
                            {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Add Member
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" /> Add Member
                    </Button>
                  )}

                  <div className="space-y-1">
                    {detailOrg.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No members yet. Add someone to get started.</p>
                    ) : (
                      detailOrg.members.map((member) => (
                        <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                              {avatarInitials(member.userId)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{member.userId}</p>
                              <p className="text-xs text-muted-foreground">
                                Joined {new Date(member.joinedAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant={roleColors[member.role] ?? "outline"} className="text-xs">{member.role}</Badge>
                            {member.role !== "owner" && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                onClick={() => handleRemoveMember(member)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Organizations</h1>
          <p className="text-muted-foreground mt-1">Manage subscriber companies, billing, and membership.</p>
        </div>
        <Button onClick={() => setNewOrgOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> New Organization
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" /> Total Organizations
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <span className="text-2xl font-bold">{organizations.length}</span>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" /> Active Members
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <span className="text-2xl font-bold">{totalMembers}</span>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CreditCard className="h-4 w-4" /> Monthly Spend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <span className="text-2xl font-bold">${totalSpend.toLocaleString()}</span>}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or slug…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="suspended">Suspended</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
          </SelectContent>
        </Select>
        <Select value={tierFilter} onValueChange={setTierFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder="Tier" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Tiers</SelectItem>
            <SelectItem value="internal">Internal</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="personal">Personal</SelectItem>
            <SelectItem value="company">Company</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("name")}>
                  <span className="flex items-center gap-1">Organization <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort("memberCount")}>
                  <span className="flex items-center gap-1">Members <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="cursor-pointer select-none text-right" onClick={() => toggleSort("monthlySpend")}>
                  <span className="flex items-center justify-end gap-1">Monthly <ArrowUpDown className="h-3 w-3" /></span>
                </TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    {organizations.length === 0 ? "No organizations yet. Create one to get started." : "No organizations match your filters."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((org) => (
                  <TableRow key={org.id} className="cursor-pointer hover:bg-muted/50" onClick={() => openDetail(org)}>
                    <TableCell>
                      <div className="font-medium">{org.name}</div>
                      <div className="text-xs text-muted-foreground">{org.slug}</div>
                    </TableCell>
                    <TableCell><Badge variant={tierColors[org.tier] ?? "outline"}>{org.tier}</Badge></TableCell>
                    <TableCell><Badge variant={statusColors[org.status] ?? "outline"}>{org.status}</Badge></TableCell>
                    <TableCell>{org.memberCount}/{org.maxSeats}</TableCell>
                    <TableCell className="text-right font-medium">${org.monthlySpend.toLocaleString()}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(org); }}>
                            <Eye className="mr-2 h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {org.status === "active" || org.status === "trial" ? (
                            <DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleSuspend(org); }}>
                              <Ban className="mr-2 h-4 w-4" /> Suspend
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleReactivate(org); }}>
                              <CheckCircle2 className="mr-2 h-4 w-4" /> Reactivate
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={(open) => { setDetailOpen(open); if (!open) { setAddMemberOpen(false); setDetailOrg(null); setSelectedOrgId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
          {selectedOrg && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> {selectedOrg.name}
                </DialogTitle>
                <DialogDescription>Organization details, members, and management actions.</DialogDescription>
              </DialogHeader>

              <Tabs defaultValue="details" className="mt-2">
                <TabsList className="grid w-full grid-cols-2 outline-none focus:outline-none focus-within:outline-none border-0 ring-0">
                  <TabsTrigger value="details" className="focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:shadow-none" style={{ outline: "none", boxShadow: "none" }}>Details</TabsTrigger>
                  <TabsTrigger value="members" className="flex items-center gap-1 focus:ring-0 focus:ring-offset-0 focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:shadow-none" style={{ outline: "none", boxShadow: "none" }}>
                    <Users className="h-3.5 w-3.5" /> Members ({detailOrg?.members.length ?? selectedOrg.memberCount})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Slug</Label>
                      <p className="text-sm font-medium">{selectedOrg.slug}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Status</Label>
                      <div><Badge variant={statusColors[selectedOrg.status] ?? "outline"}>{selectedOrg.status}</Badge></div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Tier</Label>
                      <div><Badge variant={tierColors[selectedOrg.tier] ?? "outline"}>{selectedOrg.tier}</Badge></div>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><Users className="h-3 w-3" /> Members</Label>
                      <p className="text-sm font-medium">{selectedOrg.memberCount} / {selectedOrg.maxSeats}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> Monthly</Label>
                      <p className="text-sm font-medium">${selectedOrg.monthlySpend.toLocaleString()}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> Created</Label>
                      <p className="text-sm font-medium">{new Date(selectedOrg.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex flex-wrap gap-2">
                    {selectedOrg.status === "active" || selectedOrg.status === "trial" ? (
                      <Button variant="destructive" size="sm" onClick={() => handleSuspend(selectedOrg)}>
                        <Ban className="mr-2 h-4 w-4" /> Suspend
                      </Button>
                    ) : (
                      <Button variant="secondary" size="sm" onClick={() => handleReactivate(selectedOrg)}>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Reactivate
                      </Button>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="members" className="space-y-4 mt-4">
                  {/* Invite member form */}
                  {addMemberOpen ? (
                    <Card>
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-semibold flex items-center gap-2">
                            <Mail className="h-4 w-4" /> Invite by Email
                          </h4>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setAddMemberOpen(false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <div>
                          <Label className="text-xs">Email Address</Label>
                          <Input type="email" placeholder="colleague@company.com" value={newMemberEmail} onChange={(e) => setNewMemberEmail(e.target.value)} className="mt-1" />
                        </div>
                        <div className="flex items-end gap-3">
                          <div className="flex-1">
                            <Label className="text-xs">Role</Label>
                            <Select value={newMemberRole} onValueChange={(v) => setNewMemberRole(v as "owner" | "admin" | "member")}>
                              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="owner">Owner</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                                <SelectItem value="member">Member</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <Button size="sm" onClick={handleSendInvitation} disabled={!newMemberEmail.trim() || inviting}>
                            {inviting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                            Add Member
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setAddMemberOpen(true)}>
                      <UserPlus className="mr-2 h-4 w-4" /> Add Member
                    </Button>
                  )}

                  {/* Members list */}
                  <div className="space-y-1">
                    {detailLoading ? (
                      <div className="flex items-center justify-center py-6">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : !detailOrg || detailOrg.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No members yet. Add someone to get started.</p>
                    ) : (
                      <>
                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5 px-3 pb-1">
                          <Users className="h-3 w-3" /> Members
                        </h4>
                        {detailOrg.members.map((member) => (
                          <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-muted/50 group">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground shrink-0">
                                {avatarInitials(member.userId)}
                              </div>
                              <div className="min-w-0">
                                <p className="text-sm font-medium truncate">{member.userId}</p>
                                <p className="text-xs text-muted-foreground">
                                  Joined {new Date(member.joinedAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant={roleColors[member.role] ?? "outline"} className="text-xs">{member.role}</Badge>
                              {member.role !== "owner" && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                                  onClick={() => handleRemoveMember(member)}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* New Organization Dialog */}
      <Dialog open={newOrgOpen} onOpenChange={(open) => { setNewOrgOpen(open); if (!open) { setNewOrgName(""); setNewOrgSlug(""); setNewOrgTier("free"); } }}>
        <DialogContent className="max-w-md" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>New Organization</DialogTitle>
            <DialogDescription>Create a new organization to manage members and billing.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Name</Label>
              <Input placeholder="Acme Corporation" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Slug</Label>
              <Input placeholder="acme-corp" value={newOrgSlug} onChange={(e) => setNewOrgSlug(e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label className="text-xs">Tier</Label>
              <Select value={newOrgTier} onValueChange={setNewOrgTier}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Internal</SelectItem>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="personal">Personal</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                  <SelectItem value="enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewOrgOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateOrg} disabled={!newOrgName.trim() || !newOrgSlug.trim() || creating}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Organization
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
