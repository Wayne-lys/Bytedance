"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  permissionLabels,
  permissions,
  type Permission
} from "@/features/auth/permissions";
import { StatusBadge } from "@/components/status-badge";

type RoleOption = {
  key: string;
  label: string;
  permissions: Permission[];
  system: boolean;
  userCount?: number;
};

type UserRow = {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  role: string;
  roleLabel: string;
  permissions: Permission[];
  createdAt: string;
};

type AsyncState =
  | { status: "idle" }
  | { status: "saving" }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type RoleFormState = {
  key: string;
  label: string;
  permissions: Permission[];
};

const emptyRoleForm: RoleFormState = {
  key: "",
  label: "",
  permissions: []
};

function userIdentity(user: UserRow) {
  return user.email ?? user.phone ?? user.id;
}

function formatPermissions(rolePermissions: Permission[]) {
  return rolePermissions.length
    ? rolePermissions.map((permission) => permissionLabels[permission]).join(" / ")
    : "仅创作，无后台管理权限";
}

function roleTone(role: RoleOption | undefined) {
  if (!role) {
    return "neutral" as const;
  }

  if (role.key === "admin" || role.permissions.includes("manage_users")) {
    return "blocked" as const;
  }

  if (role.permissions.length > 0) {
    return "warning" as const;
  }

  return "neutral" as const;
}

export function UserRoleManager({
  users,
  roles,
  currentUserId
}: {
  users: UserRow[];
  roles: RoleOption[];
  currentUserId: string;
}) {
  const [hydrated, setHydrated] = useState(false);
  const [rows, setRows] = useState(users);
  const [roleOptions, setRoleOptions] = useState(roles);
  const [states, setStates] = useState<Record<string, AsyncState>>({});
  const [userState, setUserState] = useState<AsyncState>({ status: "idle" });
  const [editingRoles, setEditingRoles] = useState<Record<string, boolean>>({});
  const [roleForm, setRoleForm] = useState<RoleFormState>(emptyRoleForm);
  const [roleState, setRoleState] = useState<AsyncState>({ status: "idle" });
  const [deletingRole, setDeletingRole] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<UserRow | null>(null);
  const selectRefs = useRef<Record<string, HTMLSelectElement | null>>({});

  useEffect(() => {
    setHydrated(true);
  }, []);

  const roleLookup = useMemo(
    () => new Map(roleOptions.map((role) => [role.key, role])),
    [roleOptions]
  );

  const roleSummary = useMemo(
    () =>
      roleOptions.map((role) => ({
        ...role,
        userCount: rows.filter((user) => user.role === role.key).length
      })),
    [roleOptions, rows]
  );

  function togglePermission(permission: Permission) {
    setRoleForm((current) => {
      const selected = new Set(current.permissions);

      if (selected.has(permission)) {
        selected.delete(permission);
      } else {
        selected.add(permission);
      }

      return {
        ...current,
        permissions: permissions.filter((item) => selected.has(item))
      };
    });
    setRoleState({ status: "idle" });
  }

  async function createRole(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setRoleState({ status: "saving" });

    try {
      const response = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(roleForm)
      });
      const payload = await response.json();

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error ?? "角色创建失败");
      }

      setRoleOptions((current) => [...current, payload.data.role]);
      setRoleForm(emptyRoleForm);
      setRoleState({
        status: "success",
        message: `已新增角色 ${payload.data.role.label}`
      });
    } catch (error) {
      setRoleState({
        status: "error",
        message: error instanceof Error ? error.message : "角色创建失败"
      });
    }
  }

  async function deleteRole(role: RoleOption) {
    if (role.system) {
      setRoleState({ status: "error", message: "系统角色不能删除。" });
      return;
    }

    setDeletingRole(role.key);
    setRoleState({ status: "saving" });

    try {
      const response = await fetch(`/api/roles/${encodeURIComponent(role.key)}`, {
        method: "DELETE"
      });
      const payload = await response.json();

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error ?? "角色删除失败");
      }

      setRoleOptions((current) =>
        current.filter((item) => item.key !== payload.data.role.key)
      );
      setRoleState({
        status: "success",
        message: `已删除角色 ${payload.data.role.label}`
      });
    } catch (error) {
      setRoleState({
        status: "error",
        message: error instanceof Error ? error.message : "角色删除失败"
      });
    } finally {
      setDeletingRole(null);
    }
  }

  async function saveRole(user: UserRow) {
    const nextRole = selectRefs.current[user.id]?.value ?? user.role;
    const nextRoleOption = roleLookup.get(nextRole);

    if (!nextRoleOption) {
      setStates((current) => ({
        ...current,
        [user.id]: { status: "error", message: "角色参数无效" }
      }));
      return;
    }

    setStates((current) => ({
      ...current,
      [user.id]: { status: "saving" }
    }));

    try {
      const response = await fetch(`/api/users/${user.id}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: nextRole })
      });
      const payload = await response.json();

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error ?? "角色保存失败");
      }

      setRows((current) =>
        current.map((item) =>
          item.id === user.id
            ? {
                ...item,
                role: payload.data.user.role,
                roleLabel: payload.data.user.roleLabel,
                permissions: payload.data.user.permissions ?? nextRoleOption.permissions
              }
            : item
        )
      );
      setEditingRoles((current) => ({
        ...current,
        [user.id]: false
      }));
      setStates((current) => ({
        ...current,
        [user.id]: {
          status: "success",
          message: `已更新为 ${payload.data.user.roleLabel}`
        }
      }));
    } catch (error) {
      setStates((current) => ({
        ...current,
        [user.id]: {
          status: "error",
          message: error instanceof Error ? error.message : "角色保存失败"
        }
      }));
    }
  }

  function beginEditRole(user: UserRow) {
    if (user.id === currentUserId) {
      return;
    }

    setEditingRoles((current) => ({
      ...current,
      [user.id]: true
    }));
    setStates((current) => ({
      ...current,
      [user.id]: { status: "idle" }
    }));
    window.requestAnimationFrame(() => {
      selectRefs.current[user.id]?.focus();
    });
  }

  function requestDeleteUser(user: UserRow) {
    const identity = userIdentity(user);

    if (user.id === currentUserId) {
      setStates((current) => ({
        ...current,
        [user.id]: { status: "error", message: "不能删除自己的账号。" }
      }));
      return;
    }

    setDeleteCandidate(user);
    setUserState({ status: "idle" });
  }

  async function confirmDeleteUser() {
    if (!deleteCandidate) {
      return;
    }

    const user = deleteCandidate;

    if (user.id === currentUserId) {
      setDeleteCandidate(null);
      return;
    }

    setUserState({ status: "idle" });
    setStates((current) => ({
      ...current,
      [user.id]: { status: "saving" }
    }));

    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "DELETE"
      });
      const payload = await response.json();

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error ?? "用户删除失败");
      }

      setRows((current) => current.filter((item) => item.id !== user.id));
      setUserState({
        status: "success",
        message: `已删除用户 ${payload.data.user.name}`
      });
      setDeleteCandidate(null);
      setStates((current) => {
        const next = { ...current };
        delete next[user.id];
        return next;
      });
    } catch (error) {
      setStates((current) => ({
        ...current,
        [user.id]: {
          status: "error",
          message: error instanceof Error ? error.message : "用户删除失败"
        }
      }));
    }
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-semibold text-accent">Role Registry</p>
            <h3 className="text-2xl font-semibold text-ink">角色库</h3>
            <p className="mt-1 text-sm leading-6 text-muted">
              新增自定义角色后，可在下方用户列表中分配；删除入口在角色卡片底部，已分配给用户的角色需先移除用户。
            </p>
          </div>
          <StatusBadge>{roleOptions.length} 个角色</StatusBadge>
        </div>

        <form
          onSubmit={(event) => void createRole(event)}
          className="grid gap-3 rounded-md border border-line bg-panel-muted p-4 xl:grid-cols-[160px_180px_minmax(0,1fr)_112px] xl:items-end"
        >
          <label className="block">
            <span className="text-xs font-semibold text-muted">角色标识</span>
            <input
              value={roleForm.key}
              disabled={!hydrated || roleState.status === "saving"}
              onChange={(event) => {
                setRoleForm((current) => ({ ...current, key: event.target.value }));
                setRoleState({ status: "idle" });
              }}
              placeholder="content_lead"
              className="studio-input mt-2 h-10 w-full px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-muted">角色名称</span>
            <input
              value={roleForm.label}
              disabled={!hydrated || roleState.status === "saving"}
              onChange={(event) => {
                setRoleForm((current) => ({ ...current, label: event.target.value }));
                setRoleState({ status: "idle" });
              }}
              placeholder="内容主管"
              className="studio-input mt-2 h-10 w-full px-3 text-sm disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>

          <fieldset>
            <legend className="text-xs font-semibold text-muted">权限范围</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {permissions.map((permission) => (
                <label
                  key={permission}
                  className="inline-flex min-h-10 items-center gap-2 rounded-md border border-line bg-panel px-3 text-sm text-ink"
                >
                  <input
                    type="checkbox"
                    checked={roleForm.permissions.includes(permission)}
                    disabled={!hydrated || roleState.status === "saving"}
                    onChange={() => togglePermission(permission)}
                    className="h-4 w-4 accent-[var(--accent)] disabled:cursor-not-allowed"
                  />
                  {permissionLabels[permission]}
                </label>
              ))}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={!hydrated || roleState.status === "saving"}
            className="studio-button h-10 bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60"
          >
            {roleState.status === "saving" && !deletingRole ? "新增中" : "新增角色"}
          </button>
        </form>

        {roleState.status === "success" || roleState.status === "error" ? (
          <p
            aria-live="polite"
            className={`text-sm font-semibold ${
              roleState.status === "success" ? "text-teal" : "text-accent"
            }`}
          >
            {roleState.message}
          </p>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {roleSummary.map((role) => (
            <article key={role.key} className="studio-tile p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-base font-semibold text-ink">
                      {role.label}
                    </h4>
                    <StatusBadge tone={roleTone(role)}>
                      {role.system ? "系统角色" : "自定义"}
                    </StatusBadge>
                  </div>
                  <p className="mt-1 text-xs text-muted">{role.key}</p>
                </div>
                <StatusBadge>{role.userCount ?? 0} 人</StatusBadge>
              </div>
              <p className="mt-3 min-h-10 text-xs leading-5 text-muted">
                {formatPermissions(role.permissions)}
              </p>
              <div className="mt-4 flex min-h-10 items-center justify-between gap-3 border-t border-line/70 pt-3">
                <p className="text-xs leading-5 text-muted">
                  {role.system
                    ? "系统角色作为基础模板保留。"
                    : (role.userCount ?? 0) > 0
                      ? "先把使用该角色的用户改为其他角色。"
                      : "未分配给用户，可直接删除。"}
                </p>
                <button
                  type="button"
                  disabled={
                    role.system ||
                    deletingRole === role.key ||
                    roleState.status === "saving" ||
                    (role.userCount ?? 0) > 0
                  }
                  onClick={() => void deleteRole(role)}
                  className="studio-button h-9 shrink-0 border border-accent/35 px-3 text-sm font-semibold text-accent hover:border-accent disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:opacity-70"
                >
                  {role.system
                    ? "系统角色不可删"
                    : (role.userCount ?? 0) > 0
                      ? "先移除用户"
                      : deletingRole === role.key
                        ? "删除中"
                        : "删除角色"}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-accent">User Assignment</p>
          <h3 className="text-2xl font-semibold text-ink">用户角色分配</h3>
        </div>
        {userState.status === "success" || userState.status === "error" ? (
          <p
            aria-live="polite"
            className={`text-sm font-semibold ${
              userState.status === "success" ? "text-teal" : "text-accent"
            }`}
          >
            {userState.message}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-md border border-line bg-panel/55">
          {rows.map((user) => {
            const identity = userIdentity(user);
            const state = states[user.id] ?? { status: "idle" };
            const isSelf = user.id === currentUserId;
            const userRole = roleLookup.get(user.role);
            const isEditing = Boolean(editingRoles[user.id]);

            return (
              <article
                key={user.id}
                className={`border-b border-line/70 px-4 py-3 transition-colors last:border-b-0 hover:bg-panel-muted/45 ${
                  isEditing ? "bg-accent/5" : ""
                }`}
              >
                <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_max-content] xl:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="truncate text-base font-semibold text-ink">
                        {user.name}
                      </h4>
                      <StatusBadge tone={roleTone(userRole)}>
                        {userRole?.label ?? user.roleLabel}
                      </StatusBadge>
                      {isSelf ? <StatusBadge>当前账号</StatusBadge> : null}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm leading-6 text-muted">
                      <span>{identity}</span>
                      <span className="hidden h-3 w-px bg-line sm:inline-block" />
                      <span>
                      权限：{formatPermissions(userRole?.permissions ?? user.permissions)}
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[190px_auto] sm:items-end xl:justify-end">
                    <label className="block">
                      <span className="flex items-center justify-between text-xs font-semibold text-muted">
                        角色
                        {isEditing ? (
                          <span className="text-[11px] text-accent">编辑中</span>
                        ) : null}
                      </span>
                      <span className="relative mt-2 block">
                        <select
                          name="role"
                          aria-label={`设置 ${identity} 角色`}
                          defaultValue={user.role}
                          ref={(element) => {
                            selectRefs.current[user.id] = element;
                          }}
                          disabled={isSelf || state.status === "saving" || !isEditing}
                          onChange={() => {
                            setStates((current) => ({
                              ...current,
                              [user.id]: { status: "idle" }
                            }));
                          }}
                          className={`studio-input h-9 w-full appearance-none pr-9 pl-3 text-sm shadow-inner disabled:cursor-not-allowed ${
                            isEditing
                              ? "border-accent bg-white text-ink shadow-[0_0_0_3px_rgb(217_75_43_/_0.1)]"
                              : "border-line bg-panel-muted text-muted opacity-90"
                          }`}
                        >
                          {roleOptions.map((role) => (
                            <option key={role.key} value={role.key}>
                              {role.label}
                            </option>
                          ))}
                        </select>
                        <span
                          aria-hidden="true"
                          className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm ${
                            isEditing ? "text-accent" : "text-muted"
                          }`}
                        >
                          ▾
                        </span>
                      </span>
                    </label>

                    <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                      <button
                        type="button"
                        aria-label={isEditing ? "保存角色" : "编辑角色"}
                        disabled={!hydrated || isSelf || state.status === "saving"}
                        onClick={() => {
                          if (isEditing) {
                            void saveRole(user);
                          } else {
                            beginEditRole(user);
                          }
                        }}
                        className="studio-button h-9 min-w-24 bg-accent px-3 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {state.status === "saving"
                          ? "处理中"
                          : isEditing
                            ? "保存"
                            : "编辑"}
                      </button>
                      <button
                        type="button"
                        aria-label="删除用户"
                        disabled={!hydrated || isSelf || state.status === "saving"}
                        onClick={() => requestDeleteUser(user)}
                        className="studio-button h-9 min-w-24 border border-accent/35 px-3 text-sm font-semibold text-accent hover:border-accent disabled:cursor-not-allowed disabled:border-line disabled:text-muted disabled:opacity-70"
                      >
                        {isSelf ? "不可删" : state.status === "saving" ? "处理中" : "删除"}
                      </button>
                    </div>
                  </div>
                </div>

                {isSelf ? (
                  <p className="mt-3 rounded-md border border-line bg-panel-muted/80 px-3 py-2 text-xs leading-5 text-muted">
                    为避免锁死后台，当前账号不能在这里修改自己的角色。
                  </p>
                ) : null}
                {state.status === "success" || state.status === "error" ? (
                  <p
                    className={`mt-3 text-sm font-semibold ${
                      state.status === "success" ? "text-teal" : "text-accent"
                    }`}
                  >
                    {state.message}
                  </p>
                ) : null}
              </article>
            );
          })}
        </div>
      </section>
      {deleteCandidate ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-sidebar/55 px-4 backdrop-blur-sm"
          role="presentation"
        >
          <section
            aria-labelledby="delete-user-title"
            aria-modal="true"
            role="dialog"
            className="studio-dialog w-full max-w-lg rounded-lg border border-accent/30 p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-accent">Danger Zone</p>
                <h3 id="delete-user-title" className="mt-1 text-2xl font-semibold text-ink">
                  删除用户
                </h3>
              </div>
              <StatusBadge tone="blocked">不可逆操作</StatusBadge>
            </div>
            <div className="mt-4 rounded-md border border-line bg-panel-muted px-4 py-3">
              <p className="text-sm font-semibold text-ink">{deleteCandidate.name}</p>
              <p className="mt-1 break-all text-sm text-muted">
                {userIdentity(deleteCandidate)}
              </p>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted">
              删除后，该账号将无法继续登录；账号下素材、草稿和发布内容会按数据库关联规则一并处理。请确认这不是当前正在使用的协作账号。
            </p>
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                disabled={states[deleteCandidate.id]?.status === "saving"}
                onClick={() => setDeleteCandidate(null)}
                className="studio-button h-10 border border-line px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                取消
              </button>
              <button
                type="button"
                disabled={states[deleteCandidate.id]?.status === "saving"}
                onClick={() => void confirmDeleteUser()}
                className="studio-button h-10 bg-accent px-4 text-sm font-semibold text-white shadow-crisp hover:bg-sidebar disabled:cursor-not-allowed disabled:opacity-60"
              >
                {states[deleteCandidate.id]?.status === "saving"
                  ? "删除中"
                  : "确认删除"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
