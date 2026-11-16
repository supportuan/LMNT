"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { Badge, Button, EmptyState } from "@/components/ui";
import { sendJson } from "@/lib/send-json";
import type { AccessScope } from "@/db/schema";

type ScopeOption = { value: AccessScope; label: string };
type CatalogGroup = {
  group: string;
  items: { key: string; label: string; description: string; defaultScope: AccessScope }[];
};
type RoleRow = {
  id: string;
  name: string;
  description: string | null;
  legacyKey: string | null;
  active: boolean;
  permissionCount: number;
  assignmentCount: number;
  permissions: { permission: string; scope: AccessScope }[];
};

/** roleId → permission → scope (presence = granted) */
type Matrix = Map<string, Map<string, AccessScope>>;

function matrixFromRoles(roles: RoleRow[]): Matrix {
  const out: Matrix = new Map();
  for (const role of roles) {
    out.set(role.id, new Map(role.permissions.map((p) => [p.permission, p.scope])));
  }
  return out;
}

function matrixEqual(a: Matrix, b: Matrix) {
  if (a.size !== b.size) return false;
  for (const [roleId, perms] of a) {
    const other = b.get(roleId);
    if (!other || other.size !== perms.size) return false;
    for (const [key, scope] of perms) {
      if (other.get(key) !== scope) return false;
    }
  }
  return true;
}

export function RolesManager({
  initialRoles,
  catalog,
  scopes,
}: {
  initialRoles: RoleRow[];
  catalog: CatalogGroup[];
  scopes: ScopeOption[];
}) {
  const [roles, setRoles] = useState(initialRoles);
  const [matrix, setMatrix] = useState(() => matrixFromRoles(initialRoles));
  const [saved, setSaved] = useState(() => matrixFromRoles(initialRoles));
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setRoles(initialRoles);
    const next = matrixFromRoles(initialRoles);
    setMatrix(next);
    setSaved(next);
  }, [initialRoles]);

  const dirty = useMemo(() => !matrixEqual(matrix, saved), [matrix, saved]);

  const visibleCatalog = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return catalog;
    return catalog
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.key.toLowerCase().includes(q) ||
            item.description.toLowerCase().includes(q) ||
            group.group.toLowerCase().includes(q),
        ),
      }))
      .filter((g) => g.items.length > 0);
  }, [catalog, filter]);

  function status(ok: boolean, text: string) {
    setError(ok ? null : text);
    setMessage(ok ? text : null);
  }

  function toggleCell(roleId: string, permission: string, defaultScope: AccessScope) {
    setMatrix((prev) => {
      const next = new Map(prev);
      const roleMap = new Map(next.get(roleId) ?? []);
      if (roleMap.has(permission)) roleMap.delete(permission);
      else roleMap.set(permission, defaultScope);
      next.set(roleId, roleMap);
      return next;
    });
  }

  function setCellScope(roleId: string, permission: string, scope: AccessScope) {
    setMatrix((prev) => {
      const next = new Map(prev);
      const roleMap = new Map(next.get(roleId) ?? []);
      if (!roleMap.has(permission)) return prev;
      roleMap.set(permission, scope);
      next.set(roleId, roleMap);
      return next;
    });
  }

  async function createRole() {
    setBusy(true);
    const res = await sendJson<{ roles: RoleRow[]; role: RoleRow }>("/api/org-roles", "POST", {
      name: newName,
      description: newDescription || undefined,
    });
    setBusy(false);
    if (!res.ok) return status(false, res.error);
    setRoles(res.data.roles);
    const next = matrixFromRoles(res.data.roles);
    setMatrix(next);
    setSaved(next);
    setNewName("");
    setNewDescription("");
    status(true, "Role created");
  }

  async function duplicateRole(role: RoleRow) {
    setBusy(true);
    const res = await sendJson<{ roles: RoleRow[]; role: RoleRow }>("/api/org-roles", "POST", {
      name: `${role.name} copy`,
      description: role.description ?? undefined,
      duplicateFromId: role.id,
    });
    setBusy(false);
    if (!res.ok) return status(false, res.error);
    setRoles(res.data.roles);
    const next = matrixFromRoles(res.data.roles);
    setMatrix(next);
    setSaved(next);
    status(true, "Role duplicated");
  }

  async function toggleActive(role: RoleRow) {
    setBusy(true);
    const res = await sendJson<{ roles: RoleRow[] }>(`/api/org-roles/${role.id}`, "PATCH", {
      active: !role.active,
    });
    setBusy(false);
    if (!res.ok) return status(false, res.error);
    setRoles(res.data.roles);
    status(true, role.active ? "Role disabled" : "Role enabled");
  }

  async function removeRole(role: RoleRow) {
    if (!window.confirm(`Delete role “${role.name}”? This cannot be undone.`)) return;
    setBusy(true);
    const res = await sendJson<{ roles: RoleRow[] }>(`/api/org-roles/${role.id}`, "DELETE");
    setBusy(false);
    if (!res.ok) return status(false, res.error);
    setRoles(res.data.roles);
    const next = matrixFromRoles(res.data.roles);
    setMatrix(next);
    setSaved(next);
    status(true, "Role deleted");
  }

  async function renameRole(role: RoleRow, name: string) {
    const trimmed = name.trim();
    if (!trimmed || trimmed === role.name) return;
    setBusy(true);
    const res = await sendJson<{ roles: RoleRow[] }>(`/api/org-roles/${role.id}`, "PATCH", { name: trimmed });
    setBusy(false);
    if (!res.ok) return status(false, res.error);
    setRoles(res.data.roles);
    status(true, "Role renamed");
  }

  async function saveMatrix() {
    setBusy(true);
    setError(null);
    setMessage(null);

    const dirtyRoleIds = roles
      .map((r) => r.id)
      .filter((id) => {
        const a = matrix.get(id) ?? new Map();
        const b = saved.get(id) ?? new Map();
        if (a.size !== b.size) return true;
        for (const [k, v] of a) if (b.get(k) !== v) return true;
        return false;
      });

    let latest = roles;
    for (const roleId of dirtyRoleIds) {
      const perms = [...(matrix.get(roleId) ?? new Map()).entries()].map(([permission, scope]) => ({
        permission,
        scope,
      }));
      const res = await sendJson<{ roles: RoleRow[] }>(`/api/org-roles/${roleId}`, "PATCH", {
        permissions: perms,
      });
      if (!res.ok) {
        setBusy(false);
        return status(false, res.error);
      }
      latest = res.data.roles;
    }

    setRoles(latest);
    const next = matrixFromRoles(latest);
    setMatrix(next);
    setSaved(next);
    setBusy(false);
    status(true, "Permissions saved — users must sign in again to refresh");
  }

  if (roles.length === 0) {
    return (
      <div className="space-y-[var(--grid-gutter)]">
        <EmptyState
          title="No roles yet"
          description="Create a role for your organisation, then assign permissions in the matrix."
        />
        <CreateRoleBar
          name={newName}
          description={newDescription}
          busy={busy}
          onName={setNewName}
          onDescription={setNewDescription}
          onCreate={createRole}
        />
      </div>
    );
  }

  return (
    <div className="space-y-[var(--grid-gutter)]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-[var(--workspace-muted)]">
            Columns are roles · rows are permissions. Names are labels only — access is permission-driven.
          </p>
          {(message || error) && (
            <p role="status" className={`mt-1 text-sm ${error ? "text-[var(--status-danger)]" : "text-[var(--emerald-neon)]"}`}>
              {error ?? message}
            </p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter permissions…"
            aria-label="Filter permissions"
            className="neu-input w-52 py-2"
          />
          <Button type="button" disabled={busy || !dirty} onClick={saveMatrix}>
            {busy ? "Saving…" : dirty ? "Save changes" : "Saved"}
          </Button>
        </div>
      </div>

      <CreateRoleBar
        name={newName}
        description={newDescription}
        busy={busy}
        onName={setNewName}
        onDescription={setNewDescription}
        onCreate={createRole}
      />

      <div className="neu-card overflow-hidden">
        <div className="max-h-[min(70vh,900px)] overflow-auto">
          <table className="min-w-full border-collapse text-sm">
            <thead className="sticky top-0 z-20 bg-[var(--workspace-surface)]">
              <tr className="border-b border-[var(--workspace-border)]">
                <th
                  scope="col"
                  className="sticky left-0 z-30 min-w-[220px] bg-[var(--workspace-surface)] px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted)]"
                >
                  Permission
                </th>
                {roles.map((role) => (
                  <th
                    key={role.id}
                    scope="col"
                    className="min-w-[140px] px-3 py-3 text-center align-bottom"
                  >
                    <div className="mx-auto flex max-w-[160px] flex-col items-center gap-1.5">
                      <input
                        defaultValue={role.name}
                        onBlur={(e) => renameRole(role, e.target.value)}
                        className="w-full rounded-[8px] bg-transparent px-1 py-0.5 text-center text-sm font-semibold outline-none ring-[var(--emerald-neon)] focus:ring-1"
                        aria-label={`Rename ${role.name}`}
                      />
                      <div className="flex flex-wrap items-center justify-center gap-1">
                        {!role.active && <Badge tone="neutral">Off</Badge>}
                        <span className="text-[10px] tabular-nums text-[var(--workspace-subtle)]">
                          {role.assignmentCount} users
                        </span>
                      </div>
                      <div className="flex flex-wrap justify-center gap-1">
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-[var(--workspace-muted)] hover:text-[var(--emerald-neon)]"
                          disabled={busy}
                          onClick={() => toggleActive(role)}
                        >
                          {role.active ? "Disable" : "Enable"}
                        </button>
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-[var(--workspace-muted)] hover:text-[var(--emerald-neon)]"
                          disabled={busy}
                          onClick={() => duplicateRole(role)}
                        >
                          Copy
                        </button>
                        <button
                          type="button"
                          className="text-[10px] font-semibold text-[var(--workspace-muted)] hover:text-[var(--status-danger)] disabled:opacity-40"
                          disabled={busy || role.assignmentCount > 0}
                          onClick={() => removeRole(role)}
                          title={role.assignmentCount > 0 ? "Reassign users first" : "Delete role"}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleCatalog.map((group) => (
                <Fragment key={group.group}>
                  <tr className="bg-[var(--moss-tint)]">
                    <th
                      colSpan={roles.length + 1}
                      scope="colgroup"
                      className="sticky left-0 px-4 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--workspace-subtle)]"
                    >
                      {group.group}
                    </th>
                  </tr>
                  {group.items.map((item) => (
                    <tr
                      key={item.key}
                      className="border-b border-[var(--workspace-border)]/70 hover:bg-[var(--moss-tint)]/50"
                    >
                      <th
                        scope="row"
                        className="sticky left-0 z-10 bg-[var(--workspace-surface)] px-4 py-2.5 text-left font-normal"
                      >
                        <div className="font-medium text-[var(--workspace-text)]">{item.label}</div>
                        <div className="text-xs text-[var(--workspace-muted)]">{item.description}</div>
                        <div className="mt-0.5 font-mono text-[10px] text-[var(--workspace-subtle)]">{item.key}</div>
                      </th>
                      {roles.map((role) => {
                        const granted = matrix.get(role.id)?.has(item.key) ?? false;
                        const scope = matrix.get(role.id)?.get(item.key) ?? item.defaultScope;
                        return (
                          <td key={`${role.id}-${item.key}`} className="px-2 py-2 text-center align-middle">
                            <div className="inline-flex flex-col items-center gap-1">
                              <input
                                type="checkbox"
                                checked={granted}
                                disabled={busy || !role.active}
                                onChange={() => toggleCell(role.id, item.key, item.defaultScope)}
                                className="h-4 w-4 accent-[var(--emerald-neon)]"
                                aria-label={`${item.label} for ${role.name}`}
                              />
                              {granted && (
                                <select
                                  value={scope}
                                  disabled={busy || !role.active}
                                  onChange={(e) => setCellScope(role.id, item.key, e.target.value as AccessScope)}
                                  className="max-w-[7.5rem] rounded-[6px] border-0 bg-[var(--moss-tint)] px-1 py-0.5 text-[10px] text-[var(--workspace-text)] outline-none ring-1 ring-[var(--moss-800)] focus:ring-[var(--emerald-neon)]"
                                  aria-label={`Scope: ${item.label} / ${role.name}`}
                                >
                                  {scopes.map((s) => (
                                    <option key={s.value} value={s.value}>
                                      {s.label}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CreateRoleBar({
  name,
  description,
  busy,
  onName,
  onDescription,
  onCreate,
}: {
  name: string;
  description: string;
  busy: boolean;
  onName: (v: string) => void;
  onDescription: (v: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="neu-card flex flex-wrap items-end gap-2 p-4">
      <label className="min-w-[160px] flex-1 text-xs">
        <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted)]">
          New role
        </span>
        <input
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Role name"
          className="neu-input"
        />
      </label>
      <label className="min-w-[200px] flex-[1.4] text-xs">
        <span className="mb-1 block font-semibold uppercase tracking-[0.12em] text-[var(--workspace-muted)]">
          Description
        </span>
        <input
          value={description}
          onChange={(e) => onDescription(e.target.value)}
          placeholder="Optional"
          className="neu-input"
        />
      </label>
      <Button type="button" size="sm" disabled={busy || !name.trim()} onClick={onCreate}>
        Create role
      </Button>
    </div>
  );
}
