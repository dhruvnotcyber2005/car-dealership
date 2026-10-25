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

const fieldClass = "mt-1 w-full rounded border border-slate-300 bg-white px-3 py-2";
const primaryButton = "rounded bg-slate-800 px-3 py-2 text-sm text-white disabled:opacity-50";
const quietButton = "rounded border border-slate-300 bg-white px-3 py-2 text-sm";

function Notice({ notice, error }) {
  if (!notice && !error) {
    return null;
  }
  return (
    <p
      className={`rounded border px-3 py-2 text-sm ${
        error ? "border-red-200 bg-red-50 text-red-800" : "border-green-200 bg-green-50 text-green-800"
      }`}
      role="status"
    >
      {error || notice}
    </p>
  );
}

function AuthScreen({ onSignedIn, initialError = "" }) {
  const [audience, setAudience] = useState(null);
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState(initialError);
  const [pending, setPending] = useState(false);

  function choose(nextAudience) {
    setAudience(nextAudience);
    setMode("login");
    setError("");
  }

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
      if (audience === "admin" && session.role !== "admin") {
        clearSession();
        setError("This account is not an administrator. Use customer sign-in instead.");
        return;
      }
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
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-semibold">Ashford Motor Co.</h1>
      <p className="mt-1 text-sm text-slate-600">Choose how you want to continue.</p>

      {audience === null ? (
        <div className="mt-6 space-y-3">
          <button type="button" className={`${primaryButton} w-full`} onClick={() => choose("customer")}>
            Sign in or register as customer
          </button>
          <button type="button" className={`${quietButton} w-full`} onClick={() => choose("admin")}>
            Sign in as admin
          </button>
          {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        </div>
      ) : (
        <>
      <button type="button" className="mt-4 text-sm text-slate-600" onClick={() => choose(null)}>
        Back
      </button>
      {audience === "customer" ? (
      <div className="mt-6 flex gap-4 border-b border-slate-200 text-sm">
        <button
          type="button"
          className={`pb-2 ${mode === "login" ? "border-b-2 border-slate-800 font-medium" : "text-slate-600"}`}
          onClick={() => setMode("login")}
        >
          Sign in
        </button>
        <button
          type="button"
          className={`pb-2 ${mode === "register" ? "border-b-2 border-slate-800 font-medium" : "text-slate-600"}`}
          onClick={() => setMode("register")}
        >
          Register
        </button>
      </div>
      ) : (
        <h2 className="mt-6 text-lg font-medium">Admin sign in</h2>
      )}

      <form className="mt-6 space-y-4" onSubmit={submit}>
        <label className="block text-sm">
          Username
          <input
            required
            name="username"
            autoComplete="username"
            value={form.username}
            onChange={update}
            className={fieldClass}
          />
        </label>
        {audience === "customer" && mode === "register" && (
          <label className="block text-sm">
            Email
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              value={form.email}
              onChange={update}
              className={fieldClass}
            />
          </label>
        )}
        <label className="block text-sm">
          Password
          <input
            required
            type="password"
            name="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={8}
            value={form.password}
            onChange={update}
            className={fieldClass}
          />
        </label>
        {error && <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
        <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
          {pending ? "Please wait…" : audience === "admin" ? "Sign in as admin" : mode === "login" ? "Sign in" : "Create account"}
        </button>
      </form>
        </>
      )}
    </main>
  );
}

function VehicleCard({ vehicle, pending, onPurchase }) {
  const soldOut = vehicle.quantity === 0;
  return (
    <article className="rounded border border-slate-200 bg-white p-4">
      <p className="text-sm text-slate-500">{vehicle.category}</p>
      <h3 className="text-lg font-semibold">
        {vehicle.make} {vehicle.model}
      </h3>
      <p className="mt-2">{money(vehicle.price)}</p>
      <p className={`mt-1 text-sm ${soldOut ? "text-red-700" : "text-slate-600"}`}>
        {soldOut ? "Out of stock" : `${vehicle.quantity} available`}
      </p>
      <button
        type="button"
        disabled={soldOut || pending}
        onClick={() => onPurchase(vehicle)}
        className={`${primaryButton} mt-4 disabled:cursor-not-allowed`}
      >
        {pending ? "Purchasing…" : soldOut ? "Unavailable" : "Purchase"}
      </button>
    </article>
  );
}

function Showroom({ vehicles, loading, filters, onChange, onSearch, onClear, purchasingId, onPurchase }) {
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Inventory</h2>
        <p className="text-sm text-slate-600">{loading ? "Loading…" : `${vehicles.length} vehicles`}</p>
      </div>

      <form className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-3 xl:grid-cols-6" onSubmit={onSearch}>
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
              className={fieldClass}
            />
          </label>
        ))}
        <div className="flex items-end gap-2">
          <button type="submit" className={primaryButton}>
            Search
          </button>
          <button type="button" onClick={onClear} className={quietButton}>
            Clear
          </button>
        </div>
      </form>

      {!loading && vehicles.length === 0 && (
        <p className="border border-slate-200 bg-white px-4 py-8 text-center text-sm text-slate-600">
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
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{editing ? "Edit vehicle" : "Add a vehicle"}</h2>

      <form className="grid gap-3 border border-slate-200 bg-white p-4 md:grid-cols-3" onSubmit={onSubmit}>
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
              className={fieldClass}
            />
          </label>
        ))}
        <div className="flex items-end gap-2">
          <button disabled={pending} className={primaryButton}>
            {editing ? "Save changes" : "Add vehicle"}
          </button>
          {editing && (
            <button type="button" onClick={onCancel} className={quietButton}>
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="overflow-x-auto border border-slate-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-slate-200 text-slate-600">
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
              <tr key={vehicle.id} className="border-b border-slate-200 last:border-0">
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
                      className="w-20 rounded border border-slate-300 px-2 py-1"
                    />
                    <button className={quietButton}>Add</button>
                  </form>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button type="button" onClick={() => onEdit(vehicle)} className={quietButton}>
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(vehicle)} className="rounded border border-red-300 px-3 py-2 text-sm text-red-700">
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {vehicles.length === 0 && (
              <tr>
                <td colSpan="6" className="px-4 py-8 text-center text-slate-600">
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
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-4 px-4 py-3">
          <p className="mr-auto font-semibold">Ashford Motor Co.</p>
          <nav className="flex flex-wrap items-center gap-4 text-sm">
            <button
              type="button"
              onClick={() => setView("showroom")}
              className={view === "showroom" ? "font-medium" : "text-slate-600"}
            >
              Inventory
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
                className={view === "manage" ? "font-medium" : "text-slate-600"}
              >
                Manage
              </button>
            )}
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>
              {session.username} ({session.role})
            </span>
            <button type="button" onClick={() => signOut("")} className={quietButton}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6">
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
