import { useEffect, useState } from "react";
import { api, clearSession, getSession, saveSession } from "./api";

const EMPTY_FILTERS = {
  make: "",
  model: "",
  category: "",
  min_price: "",
  max_price: "",
};

const EMPTY_VEHICLE = {
  make: "",
  model: "",
  category: "",
  price: "",
  quantity: "",
};

function money(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
}

function queryString(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (String(value).trim() !== "") {
      params.set(key, String(value).trim());
    }
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

function CarMark() {
  return (
    <svg viewBox="0 0 64 32" className="h-8 w-16 text-brass" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 20h4l3-7h22l6 7h9a4 4 0 0 1 4 4v2H4v-2a4 4 0 0 1 4-4zm8 6a4 4 0 1 0 0.01 0zm28 0a4 4 0 1 0 0.01 0zM18 14l-2 6h28l-4-6H18z"
      />
    </svg>
  );
}

function Notice({ notice, error }) {
  if (!notice && !error) {
    return null;
  }
  return (
    <div
      className={`rounded-lg border px-4 py-3 text-sm ${
        error
          ? "border-danger/30 bg-red-50 text-danger"
          : "border-moss/30 bg-emerald-50 text-moss"
      }`}
      role="status"
    >
      {error || notice}
    </div>
  );
}

function AuthScreen({ onSignedIn, initialError = "" }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);

  function update(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      if (mode === "register") {
        await api("/api/auth/register", {
          method: "POST",
          auth: false,
          body: {
            username: form.username.trim(),
            email: form.email.trim(),
            password: form.password,
          },
        });
      }
      const session = await api("/api/auth/login", {
        method: "POST",
        auth: false,
        body: { username: form.username.trim(), password: form.password },
      });
      saveSession(session);
      onSignedIn({
        token: session.access_token,
        username: session.username,
        role: session.role,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <section className="flex flex-col justify-between bg-pine px-8 py-10 text-paper sm:px-12">
        <div className="flex items-center gap-3">
          <CarMark />
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-brass">Est. showroom</p>
            <p className="font-display text-2xl">Ashford Motor Co.</p>
          </div>
        </div>
        <div className="max-w-md py-16">
          <h1 className="font-display text-5xl leading-tight">
            A quieter way to see what is on the lot.
          </h1>
          <p className="mt-6 text-lg text-paper/80">
            Browse make, model, and price. Purchase when a car is in stock.
            Administrators keep the inventory honest.
          </p>
        </div>
        <p className="text-sm text-paper/60">Customer accounts are created from the form. Admin access is issued separately.</p>
      </section>

      <section className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-brass-dark">Account</p>
          <h2 className="mt-2 font-display text-4xl text-ink">
            {mode === "login" ? "Sign in" : "Create an account"}
          </h2>
          <div className="mt-6 grid grid-cols-2 rounded-full bg-line p-1 text-sm">
            <button
              type="button"
              className={`rounded-full px-4 py-2 ${mode === "login" ? "bg-card shadow" : ""}`}
              onClick={() => setMode("login")}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`rounded-full px-4 py-2 ${mode === "register" ? "bg-card shadow" : ""}`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          <form className="mt-8 space-y-4" onSubmit={submit}>
            <label className="block text-sm font-medium">
              Username
              <input
                required
                name="username"
                autoComplete="username"
                value={form.username}
                onChange={update}
                className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2"
              />
            </label>
            {mode === "register" && (
              <label className="block text-sm font-medium">
                Email
                <input
                  required
                  type="email"
                  name="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={update}
                  className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2"
                />
              </label>
            )}
            <label className="block text-sm font-medium">
              Password
              <input
                required
                type="password"
                name="password"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                minLength={8}
                value={form.password}
                onChange={update}
                className="mt-1 w-full rounded-lg border border-line bg-card px-3 py-2"
              />
            </label>
            {error && (
              <p className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm text-danger">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={pending}
              className="w-full rounded-lg bg-pine px-4 py-3 font-medium text-paper disabled:opacity-60"
            >
              {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account and sign in"}
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}

function VehicleCard({ vehicle, pending, onPurchase }) {
  const soldOut = vehicle.quantity === 0;
  return (
    <article className="flex flex-col rounded-2xl border border-line bg-card p-5 shadow-sm">
      <div className={`mb-5 flex h-28 items-end rounded-xl bg-paper px-4 py-3 ${soldOut ? "opacity-60" : ""}`}>
        <CarMark />
        <p className="mb-1 ml-auto text-xs uppercase tracking-[0.18em] text-moss">{vehicle.category}</p>
      </div>
      <p className="text-xs uppercase tracking-[0.22em] text-brass-dark">{vehicle.make}</p>
      <h3 className="font-display text-3xl">{vehicle.model}</h3>
      <p className="mt-3 text-2xl font-semibold">{money(vehicle.price)}</p>
      <p className={`mt-1 text-sm ${soldOut ? "text-danger" : "text-moss"}`}>
        {soldOut ? "Out of stock" : `${vehicle.quantity} available`}
      </p>
      <button
        type="button"
        disabled={soldOut || pending}
        onClick={() => onPurchase(vehicle)}
        className="mt-5 rounded-lg bg-brass px-4 py-2 font-medium text-ink disabled:cursor-not-allowed disabled:bg-line disabled:text-ink/50"
      >
        {pending ? "Purchasing…" : soldOut ? "Unavailable" : "Purchase"}
      </button>
    </article>
  );
}

function Showroom({ vehicles, loading, filters, onChange, onSearch, onClear, purchasingId, onPurchase }) {
  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-4xl">Showroom</h2>
          <p className="text-ink/70">Every listing stays visible, including cars that are sold out.</p>
        </div>
        <p className="text-sm text-ink/60">{loading ? "Loading…" : `${vehicles.length} vehicles`}</p>
      </div>

      <form
        className="grid gap-3 rounded-2xl border border-line bg-card p-4 md:grid-cols-3 xl:grid-cols-6"
        onSubmit={onSearch}
      >
        {[
          ["make", "Make"],
          ["model", "Model"],
          ["category", "Category"],
          ["min_price", "Min price"],
          ["max_price", "Max price"],
        ].map(([name, label]) => (
          <label key={name} className="text-sm font-medium">
            {label}
            <input
              name={name}
              value={filters[name]}
              onChange={onChange}
              inputMode={name.includes("price") ? "decimal" : "text"}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2"
            />
          </label>
        ))}
        <div className="flex items-end gap-2">
          <button type="submit" className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper">
            Search
          </button>
          <button type="button" onClick={onClear} className="rounded-lg border border-line px-4 py-2 text-sm">
            Clear
          </button>
        </div>
      </form>

      {!loading && vehicles.length === 0 && (
        <p className="rounded-2xl border border-dashed border-line bg-card px-4 py-10 text-center text-ink/70">
          No vehicles match this search.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {vehicles.map((vehicle) => (
          <VehicleCard
            key={vehicle.id}
            vehicle={vehicle}
            pending={purchasingId === vehicle.id}
            onPurchase={onPurchase}
          />
        ))}
      </div>
    </section>
  );
}

function AdminPanel({ form, editing, onChange, onSubmit, onCancel, vehicles, restock, onRestockChange, onRestock, onEdit, onDelete, pending }) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-4xl">{editing ? "Edit vehicle" : "Add a vehicle"}</h2>
        <p className="text-ink/70">These actions are limited to administrators. The server checks the role again.</p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-line bg-card p-4 md:grid-cols-3" onSubmit={onSubmit}>
        {[
          ["make", "Make", "text"],
          ["model", "Model", "text"],
          ["category", "Category", "text"],
          ["price", "Price", "number"],
          ["quantity", "Quantity", "number"],
        ].map(([name, label, type]) => (
          <label key={name} className="text-sm font-medium">
            {label}
            <input
              required
              name={name}
              type={type}
              min={name === "price" ? "0.01" : "0"}
              step={name === "price" ? "0.01" : "1"}
              value={form[name]}
              onChange={onChange}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2"
            />
          </label>
        ))}
        <div className="flex items-end gap-2">
          <button disabled={pending} className="rounded-lg bg-pine px-4 py-2 text-sm font-medium text-paper disabled:opacity-60">
            {editing ? "Save changes" : "Add vehicle"}
          </button>
          {editing && (
            <button type="button" onClick={onCancel} className="rounded-lg border border-line px-4 py-2 text-sm">
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-line bg-card">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-line text-xs uppercase tracking-wider text-ink/60">
            <tr>
              <th className="px-4 py-3">Vehicle</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Stock</th>
              <th className="px-4 py-3">Restock</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3">
                  <span className="font-medium">{vehicle.make} {vehicle.model}</span>
                </td>
                <td className="px-4 py-3">{vehicle.category}</td>
                <td className="px-4 py-3">{money(vehicle.price)}</td>
                <td className="px-4 py-3">{vehicle.quantity}</td>
                <td className="px-4 py-3">
                  <form className="flex gap-2" onSubmit={(event) => onRestock(event, vehicle)}>
                    <input
                      aria-label={`Restock quantity for ${vehicle.make} ${vehicle.model}`}
                      type="number"
                      min="1"
                      step="1"
                      value={restock[vehicle.id] ?? "1"}
                      onChange={(event) => onRestockChange(vehicle.id, event.target.value)}
                      className="w-20 rounded-lg border border-line px-2 py-1"
                    />
                    <button className="rounded-lg border border-line px-3 py-1">Add</button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onEdit(vehicle)} className="rounded-lg border border-line px-3 py-1">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(vehicle)} className="rounded-lg border border-danger/40 px-3 py-1 text-danger">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-ink/60">
                  No vehicles yet. Add the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default function App() {
  const [session, setSession] = useState(() => {
    const stored = getSession();
    return stored.token ? stored : null;
  });
  const [signedOutMessage, setSignedOutMessage] = useState("");
  const [view, setView] = useState("showroom");
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [purchasingId, setPurchasingId] = useState(null);
  const [vehicleForm, setVehicleForm] = useState(EMPTY_VEHICLE);
  const [editingId, setEditingId] = useState(null);
  const [restock, setRestock] = useState({});
  const [saving, setSaving] = useState(false);

  function signOut(message) {
    clearSession();
    setSession(null);
    setVehicles([]);
    setView("showroom");
    setNotice("");
    setError("");
    setSignedOutMessage(message || "");
  }

  async function loadVehicles(nextFilters = appliedFilters) {
    setLoading(true);
    setError("");
    try {
      const path = nextFilters
        ? `/api/vehicles/search${queryString(nextFilters)}`
        : "/api/vehicles";
      const data = await api(path);
      setVehicles(data);
    } catch (err) {
      if (err.status === 401) {
        signOut(err.message);
        return;
      }
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (session?.token) {
      loadVehicles(null);
    }
    // Load once when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token]);

  if (!session?.token) {
    return <AuthScreen initialError={signedOutMessage} onSignedIn={setSession} />;
  }

  const isAdmin = session.role === "admin";

  async function purchase(vehicle) {
    setNotice("");
    setError("");
    setPurchasingId(vehicle.id);
    try {
      const updated = await api(`/api/vehicles/${vehicle.id}/purchase`, { method: "POST" });
      setNotice(`Purchased one ${updated.make} ${updated.model}. ${updated.quantity} left.`);
      await loadVehicles();
    } catch (err) {
      if (err.status === 401) {
        signOut(err.message);
        return;
      }
      setError(err.message);
      await loadVehicles();
    } finally {
      setPurchasingId(null);
    }
  }

  function search(event) {
    event.preventDefault();
    const next = { ...filters };
    const hasFilter = Object.values(next).some((value) => String(value).trim() !== "");
    const applied = hasFilter ? next : null;
    setAppliedFilters(applied);
    loadVehicles(applied);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(null);
    loadVehicles(null);
  }

  function vehicleBody() {
    return {
      make: vehicleForm.make.trim(),
      model: vehicleForm.model.trim(),
      category: vehicleForm.category.trim(),
      price: Number(vehicleForm.price),
      quantity: Number(vehicleForm.quantity),
    };
  }

  async function saveVehicle(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      if (editingId) {
        await api(`/api/vehicles/${editingId}`, { method: "PUT", body: vehicleBody() });
        setNotice("Vehicle updated.");
      } else {
        await api("/api/vehicles", { method: "POST", body: vehicleBody() });
        setNotice("Vehicle added.");
      }
      setVehicleForm(EMPTY_VEHICLE);
      setEditingId(null);
      await loadVehicles();
    } catch (err) {
      if (err.status === 401) {
        signOut(err.message);
        return;
      }
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function editVehicle(vehicle) {
    setEditingId(vehicle.id);
    setVehicleForm({
      make: vehicle.make,
      model: vehicle.model,
      category: vehicle.category,
      price: String(vehicle.price),
      quantity: String(vehicle.quantity),
    });
    setView("manage");
  }

  async function deleteVehicle(vehicle) {
    const confirmed = window.confirm(`Delete the ${vehicle.make} ${vehicle.model}?`);
    if (!confirmed) {
      return;
    }
    setError("");
    setNotice("");
    try {
      await api(`/api/vehicles/${vehicle.id}`, { method: "DELETE" });
      setNotice("Vehicle deleted.");
      if (editingId === vehicle.id) {
        setEditingId(null);
        setVehicleForm(EMPTY_VEHICLE);
      }
      await loadVehicles();
    } catch (err) {
      if (err.status === 401) {
        signOut(err.message);
        return;
      }
      setError(err.message);
    }
  }

  async function restockVehicle(event, vehicle) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      const updated = await api(`/api/vehicles/${vehicle.id}/restock`, {
        method: "POST",
        body: { quantity: Number(restock[vehicle.id] || 1) },
      });
      setNotice(`${updated.make} ${updated.model} now has ${updated.quantity} in stock.`);
      await loadVehicles();
    } catch (err) {
      if (err.status === 401) {
        signOut(err.message);
        return;
      }
      setError(err.message);
    }
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-black/10 bg-pine text-paper">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-4">
          <div className="mr-auto flex items-center gap-3">
            <CarMark />
            <div>
              <p className="font-display text-xl leading-none">Ashford Motor Co.</p>
              <p className="text-xs uppercase tracking-[0.18em] text-brass">Inventory</p>
            </div>
          </div>
          <nav className="flex flex-wrap items-center gap-2 text-sm">
            <button
              type="button"
              onClick={() => setView("showroom")}
              className={`rounded-full px-4 py-2 ${view === "showroom" ? "bg-paper text-ink" : "text-paper"}`}
            >
              Showroom
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => {
                  setView("manage");
                  setFilters(EMPTY_FILTERS);
                  setAppliedFilters(null);
                  loadVehicles(null);
                }}
                className={`rounded-full px-4 py-2 ${view === "manage" ? "bg-paper text-ink" : "text-paper"}`}
              >
                Manage inventory
              </button>
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm">
            <span>
              {session.username}
              <span className="ml-2 rounded-full bg-brass/20 px-2 py-0.5 text-xs uppercase tracking-wide text-brass">
                {session.role}
              </span>
            </span>
            <button
              type="button"
              onClick={() => signOut("")}
              className="rounded-full border border-paper/30 px-3 py-1"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-8">
        <Notice notice={notice} error={error} />
        {view === "manage" && isAdmin ? (
          <AdminPanel
            form={vehicleForm}
            editing={Boolean(editingId)}
            pending={saving}
            onChange={(event) =>
              setVehicleForm((current) => ({ ...current, [event.target.name]: event.target.value }))
            }
            onSubmit={saveVehicle}
            onCancel={() => {
              setEditingId(null);
              setVehicleForm(EMPTY_VEHICLE);
            }}
            vehicles={vehicles}
            restock={restock}
            onRestockChange={(id, value) => setRestock((current) => ({ ...current, [id]: value }))}
            onRestock={restockVehicle}
            onEdit={editVehicle}
            onDelete={deleteVehicle}
          />
        ) : (
          <Showroom
            vehicles={vehicles}
            loading={loading}
            filters={filters}
            onChange={(event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }))}
            onSearch={search}
            onClear={clearFilters}
            purchasingId={purchasingId}
            onPurchase={purchase}
          />
        )}
      </main>
    </div>
  );
}
