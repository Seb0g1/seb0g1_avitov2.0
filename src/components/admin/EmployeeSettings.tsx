"use client";

import { FormEvent, useMemo, useState } from "react";
import type { UserRole } from "@prisma/client";
import { KeyRound, Plus, RefreshCw, ShieldCheck, UserRound } from "lucide-react";
import type { EmployeeDto, EmployeeStatsDto } from "@/types/catalog";
import { Button, Modal } from "./ui";

export function EmployeeSettings({
  initialEmployees,
  initialStats
}: {
  initialEmployees: EmployeeDto[];
  initialStats: EmployeeStatsDto[];
}) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [stats, setStats] = useState(initialStats);
  const [message, setMessage] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [passwordTarget, setPasswordTarget] = useState<EmployeeDto | null>(null);
  const statById = useMemo(() => new Map(stats.map((item) => [item.employee.id, item])), [stats]);

  async function refresh() {
    const [employeesResponse, statsResponse] = await Promise.all([
      fetch("/api/settings/employees"),
      fetch("/api/settings/employees/stats?period=30d")
    ]);
    const employeesBody = await employeesResponse.json();
    const statsBody = await statsResponse.json();
    setEmployees(employeesBody.employees ?? []);
    setStats(statsBody.stats ?? []);
  }

  async function createEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/settings/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: formData.get("email"),
        name: formData.get("name"),
        password: formData.get("password"),
        role: formData.get("role")
      })
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setMessage(body?.message ?? "Не удалось создать сотрудника.");
      return;
    }
    setMessage("Сотрудник создан.");
    setIsCreateOpen(false);
    await refresh();
  }

  async function updateEmployee(id: string, patch: Partial<{ role: UserRole; isActive: boolean }>) {
    const response = await fetch(`/api/settings/employees/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    setMessage(response.ok ? "Сотрудник обновлён." : "Не удалось обновить сотрудника.");
    await refresh();
  }

  async function updatePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!passwordTarget) {
      return;
    }
    const formData = new FormData(event.currentTarget);
    const response = await fetch(`/api/settings/employees/${passwordTarget.id}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: formData.get("password") })
    });
    setMessage(response.ok ? "Пароль обновлён." : "Не удалось обновить пароль.");
    setPasswordTarget(null);
  }

  return (
    <section className="settings-card">
      <div className="toolbar" style={{ justifyContent: "space-between" }}>
        <div>
          <p className="eyebrow">Команда</p>
          <h2>Сотрудники и статистика</h2>
        </div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          {message ? <span className="toast">{message}</span> : null}
          <Button type="button" onClick={refresh}>
            <RefreshCw size={18} aria-hidden />
            Обновить
          </Button>
          <Button type="button" tone="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={18} aria-hidden />
            Добавить
          </Button>
        </div>
      </div>

      <div className="employee-list">
        {employees.map((employee) => {
          const stat = statById.get(employee.id);
          return (
            <article className="employee-row" key={employee.id}>
              <div className="toolbar" style={{ justifyContent: "space-between", marginBottom: 0 }}>
                <div className="toolbar" style={{ marginBottom: 0 }}>
                  <UserRound size={18} aria-hidden />
                  <div>
                    <strong>{employee.name ?? employee.email}</strong>
                    <div className="muted">{employee.email}</div>
                  </div>
                </div>
                <div className="toolbar" style={{ marginBottom: 0 }}>
                  <span className={employee.isActive ? "status PUBLISHED" : "status REMOVED"}>
                    {employee.isActive ? "Активен" : "Выключен"}
                  </span>
                  <select
                    className="select"
                    value={employee.role}
                    onChange={(event) => updateEmployee(employee.id, { role: event.target.value as UserRole })}
                    style={{ width: 150 }}
                  >
                    <option value="ADMIN">ADMIN</option>
                    <option value="EMPLOYEE">EMPLOYEE</option>
                  </select>
                </div>
              </div>

              <div className="employee-stat-grid">
                <div className="employee-stat"><strong>{stat?.actions ?? 0}</strong><div className="muted">действий</div></div>
                <div className="employee-stat"><strong>{stat?.productsCreated ?? 0}</strong><div className="muted">товаров создано</div></div>
                <div className="employee-stat"><strong>{stat?.variantsUpdated ?? 0}</strong><div className="muted">вариантов обновлено</div></div>
                <div className="employee-stat"><strong>{stat?.imports ?? 0}</strong><div className="muted">импортов</div></div>
              </div>

              <div className="toolbar" style={{ marginBottom: 0 }}>
                <Button type="button" onClick={() => updateEmployee(employee.id, { isActive: !employee.isActive })}>
                  <ShieldCheck size={18} aria-hidden />
                  {employee.isActive ? "Выключить" : "Включить"}
                </Button>
                <Button type="button" onClick={() => setPasswordTarget(employee)}>
                  <KeyRound size={18} aria-hidden />
                  Сменить пароль
                </Button>
                <span className="muted">
                  Последний вход: {employee.lastLoginAt ? new Date(employee.lastLoginAt).toLocaleString("ru-RU") : "ещё не входил"}
                </span>
              </div>
            </article>
          );
        })}
      </div>

      <Modal
        open={isCreateOpen}
        title="Добавить сотрудника"
        description="Сотрудник сможет войти в панель под своим email и паролем."
        onClose={() => setIsCreateOpen(false)}
      >
        <form className="form-grid" onSubmit={createEmployee}>
          <label>
            Имя
            <input className="field" name="name" required />
          </label>
          <label>
            Email
            <input className="field" name="email" type="email" required />
          </label>
          <label>
            Пароль
            <input className="field" name="password" type="password" minLength={8} required />
          </label>
          <label>
            Роль
            <select className="select" name="role" defaultValue="EMPLOYEE">
              <option value="EMPLOYEE">EMPLOYEE</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
          <div className="modal-footer span-full" style={{ padding: 0, border: 0 }}>
            <Button type="button" onClick={() => setIsCreateOpen(false)}>Отмена</Button>
            <Button type="submit" tone="primary">Создать</Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(passwordTarget)}
        title="Сменить пароль"
        description={passwordTarget?.email}
        onClose={() => setPasswordTarget(null)}
      >
        <form className="form-grid" onSubmit={updatePassword}>
          <label className="span-full">
            Новый пароль
            <input className="field" name="password" type="password" minLength={8} required />
          </label>
          <div className="modal-footer span-full" style={{ padding: 0, border: 0 }}>
            <Button type="button" onClick={() => setPasswordTarget(null)}>Отмена</Button>
            <Button type="submit" tone="primary">Сохранить</Button>
          </div>
        </form>
      </Modal>
    </section>
  );
}
