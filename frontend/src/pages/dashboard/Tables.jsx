import { useEffect, useRef, useState } from "react";
import api from "../../services/api";

const emptyForm = {
  name: "",
  capacity: "",
  location: "Main Dining",
};

const Tables = () => {
  const [tables, setTables] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState("");

  const fileInputRef = useRef(null);

  // ==========================================
  // FETCH TABLES
  // ==========================================

  const fetchTables = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/tables");

      setTables(response.data.tables || []);
    } catch (err) {
      console.error("Tables error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to load tables."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTables();
  }, []);

  // ==========================================
  // OPEN CREATE MODAL
  // ==========================================

  const openCreateModal = () => {
    setEditingTable(null);
    setForm(emptyForm);

    setSelectedImage(null);
    setImagePreview("");

    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setShowModal(true);
  };

  // ==========================================
  // OPEN EDIT MODAL
  // ==========================================

  const openEditModal = (table) => {
    setEditingTable(table);

    setForm({
      name: table.name || "",
      capacity: table.capacity || "",
      location: table.location || "Main Dining",
    });

    setSelectedImage(null);
    setImagePreview(table.image || "");

    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setShowModal(true);
  };

  // ==========================================
  // CLOSE MODAL
  // ==========================================

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingTable(null);

    setForm(emptyForm);

    setSelectedImage(null);
    setImagePreview("");

    setError("");
    setSuccess("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==========================================
  // HANDLE INPUT
  // ==========================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ==========================================
  // HANDLE IMAGE
  // ==========================================

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be smaller than 5MB.");
      event.target.value = "";
      return;
    }

    setError("");

    setSelectedImage(file);

    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  // ==========================================
  // REMOVE SELECTED IMAGE
  // ==========================================

  const removeSelectedImage = () => {
    setSelectedImage(null);

    if (editingTable?.image) {
      setImagePreview(editingTable.image);
    } else {
      setImagePreview("");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==========================================
  // SUBMIT FORM
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!form.name.trim()) {
      setError("Table name is required.");
      return;
    }

    const capacity = Number(form.capacity);

    if (
      !Number.isInteger(capacity) ||
      capacity < 1 ||
      capacity > 50
    ) {
      setError(
        "Capacity must be a whole number between 1 and 50."
      );
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("name", form.name.trim());

      formData.append("capacity", String(capacity));

      formData.append(
        "location",
        form.location.trim() || "Main Dining"
      );

      if (selectedImage) {
        formData.append("image", selectedImage);
      }

      if (!editingTable) {
        await api.post("/tables", formData);

        setSuccess("Table created successfully.");
      } else {
        await api.put(
          `/tables/${editingTable._id}`,
          formData
        );

        setSuccess("Table updated successfully.");
      }

      await fetchTables();

      setTimeout(() => {
        closeModal();
      }, 500);
    } catch (err) {
      console.error("Save table error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to save table."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // TOGGLE AVAILABILITY
  // ==========================================

  const handleToggleAvailability = async (table) => {
    try {
      setError("");

      await api.put(
        `/tables/${table._id}/availability`,
        {
          isAvailable: !table.isAvailable,
        }
      );

      await fetchTables();
    } catch (err) {
      console.error("Availability error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to update availability."
      );
    }
  };

  // ==========================================
  // DELETE TABLE
  // ==========================================

  const handleDelete = async (table) => {
    const confirmed = window.confirm(
      `Delete "${table.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setError("");

      await api.delete(`/tables/${table._id}`);

      setTables((current) =>
        current.filter(
          (item) => item._id !== table._id
        )
      );
    } catch (err) {
      console.error("Delete table error:", err);

      setError(
        err.response?.data?.message ||
          "Failed to delete table."
      );
    }
  };

  // ==========================================
  // STATISTICS
  // ==========================================

  const totalTables = tables.length;

  const availableTables = tables.filter(
    (table) => table.isAvailable
  ).length;

  const unavailableTables =
    totalTables - availableTables;

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <section className="min-h-full">
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-stone-200 border-t-stone-900" />

          <p className="text-sm text-stone-500">
            Loading tables...
          </p>
        </div>
      </section>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section className="mx-auto w-full max-w-[1400px] pb-10">
      {/* ======================================
          HEADER
      ====================================== */}

      <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
            Restaurant operations
          </span>

          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            Tables
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-500">
            Organize your dining space and control
            which tables are available for
            reservations.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 active:scale-[0.98]"
        >
          <span className="text-lg leading-none">
            +
          </span>

          Add table
        </button>
      </div>

      {/* ======================================
          ERROR
      ====================================== */}

      {error && !showModal && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* ======================================
          STATS
      ====================================== */}

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-stone-400">
            Total tables
          </span>

          <strong className="mt-3 block text-3xl font-semibold text-stone-900">
            {totalTables}
          </strong>
        </div>

        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 shadow-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-emerald-700/70">
            Available
          </span>

          <strong className="mt-3 block text-3xl font-semibold text-emerald-800">
            {availableTables}
          </strong>
        </div>

        <div className="rounded-2xl border border-stone-200 bg-stone-50 p-5 shadow-sm">
          <span className="text-xs font-medium uppercase tracking-wider text-stone-400">
            Unavailable
          </span>

          <strong className="mt-3 block text-3xl font-semibold text-stone-700">
            {unavailableTables}
          </strong>
        </div>
      </div>

      {/* ======================================
          EMPTY STATE
      ====================================== */}

      {tables.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-300 bg-stone-50 px-6 py-20 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-stone-900 text-2xl font-semibold text-white shadow-lg">
            T
          </div>

          <h2 className="mt-5 text-xl font-semibold text-stone-900">
            Your dining room is empty
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
            Add your first table to start
            accepting reservations.
          </p>

          <button
            type="button"
            onClick={openCreateModal}
            className="mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-stone-900 px-5 text-sm font-semibold text-white transition hover:bg-stone-800"
          >
            Add your first table
          </button>
        </div>
      ) : (
        /* ====================================
           TABLE GRID
        ==================================== */

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => (
            <article
              key={table._id}
              className={`group overflow-hidden rounded-3xl border bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl ${
                table.isAvailable
                  ? "border-stone-200"
                  : "border-stone-200 opacity-75"
              }`}
            >
              {/* IMAGE */}

              <div className="relative h-56 overflow-hidden bg-stone-100">
                {table.image ? (
                  <img
                    src={table.image}
                    alt={`${table.name} table`}
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-4 bg-[radial-gradient(circle_at_center,_#ffffff_0%,_#f5f1eb_55%,_#e8e0d5_100%)]">
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border-[8px] border-stone-300 bg-white shadow-lg">
                      <span className="text-2xl font-semibold text-stone-600">
                        {table.capacity}
                      </span>
                    </div>

                    <span className="text-xs font-medium text-stone-500">
                      No table photo
                    </span>
                  </div>
                )}

                <span
                  className={`absolute left-4 top-4 rounded-full px-3 py-1.5 text-[11px] font-bold shadow-sm backdrop-blur-md ${
                    table.isAvailable
                      ? "bg-emerald-50/95 text-emerald-700"
                      : "bg-red-50/95 text-red-700"
                  }`}
                >
                  {table.isAvailable
                    ? "Available"
                    : "Unavailable"}
                </span>
              </div>

              {/* CONTENT */}

              <div className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h2 className="truncate text-lg font-semibold text-stone-900">
                      {table.name}
                    </h2>

                    <p className="mt-1 text-sm text-stone-500">
                      {table.location ||
                        "Main Dining"}
                    </p>
                  </div>

                  <div className="shrink-0 text-right">
                    <strong className="block text-xl font-semibold text-stone-900">
                      {table.capacity}
                    </strong>

                    <span className="text-[11px] text-stone-400">
                      guests
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openEditModal(table)
                    }
                    className="rounded-xl border border-stone-200 px-2 py-2.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleToggleAvailability(
                        table
                      )
                    }
                    className="rounded-xl border border-stone-200 px-2 py-2.5 text-xs font-semibold text-stone-700 transition hover:bg-stone-50"
                  >
                    {table.isAvailable
                      ? "Disable"
                      : "Enable"}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleDelete(table)
                    }
                    className="rounded-xl border border-red-100 px-2 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* ======================================
          MODAL
      ====================================== */}

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            {/* MODAL HEADER */}

            <div className="flex items-start justify-between gap-6 border-b border-stone-100 p-6 sm:p-7">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-400">
                  Table setup
                </span>

                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-stone-900">
                  {editingTable
                    ? "Edit table"
                    : "Add a table"}
                </h2>

                <p className="mt-2 max-w-lg text-sm leading-6 text-stone-500">
                  Add the details guests and staff
                  need to identify this table.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={saving}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-100 text-xl text-stone-500 transition hover:bg-stone-200 hover:text-stone-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                ×
              </button>
            </div>

            {/* FORM */}

            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6 sm:p-7"
            >
              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                  {success}
                </div>
              )}

              {/* IMAGE UPLOAD */}

              <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 sm:p-5">
                <div className="flex flex-col gap-5 sm:flex-row">
                  <div className="h-32 w-full shrink-0 overflow-hidden rounded-2xl bg-stone-200 sm:w-40">
                    {imagePreview ? (
                      <img
                        src={imagePreview}
                        alt="Table preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center text-stone-400">
                        <span className="text-3xl font-light">
                          +
                        </span>

                        <span className="mt-1 text-xs">
                          Table photo
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col justify-center">
                    <h3 className="text-sm font-semibold text-stone-900">
                      Table photo
                    </h3>

                    <p className="mt-1 max-w-lg text-xs leading-5 text-stone-500">
                      Add a photo of the table or
                      its area. This will make the
                      customer reservation
                      experience more visual.
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center rounded-xl bg-stone-900 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-stone-800">
                        {selectedImage
                          ? "Change image"
                          : "Choose image"}

                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={
                            handleImageChange
                          }
                          hidden
                        />
                      </label>

                      {selectedImage && (
                        <button
                          type="button"
                          onClick={
                            removeSelectedImage
                          }
                          className="text-xs font-semibold text-red-600 transition hover:text-red-700"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <span className="mt-2 text-[10px] text-stone-400">
                      JPG, PNG or WebP · Max 5MB
                    </span>
                  </div>
                </div>
              </div>

              {/* FORM FIELDS */}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label
                    htmlFor="table-name"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Table name
                  </label>

                  <input
                    id="table-name"
                    name="name"
                    type="text"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Table 01"
                    maxLength={50}
                    required
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-4 focus:ring-stone-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="table-capacity"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Seating capacity
                  </label>

                  <input
                    id="table-capacity"
                    name="capacity"
                    type="number"
                    min="1"
                    max="50"
                    value={form.capacity}
                    onChange={handleChange}
                    placeholder="4"
                    required
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-4 focus:ring-stone-100"
                  />
                </div>

                <div>
                  <label
                    htmlFor="table-location"
                    className="mb-2 block text-sm font-medium text-stone-700"
                  >
                    Location
                  </label>

                  <input
                    id="table-location"
                    name="location"
                    type="text"
                    value={form.location}
                    onChange={handleChange}
                    placeholder="Main Dining"
                    maxLength={100}
                    className="h-11 w-full rounded-xl border border-stone-200 bg-white px-4 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-4 focus:ring-stone-100"
                  />
                </div>
              </div>

              {/* FOOTER */}

              <div className="flex flex-col-reverse gap-3 border-t border-stone-100 pt-6 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="h-11 rounded-xl border border-stone-200 px-5 text-sm font-semibold text-stone-700 transition hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="h-11 rounded-xl bg-stone-900 px-6 text-sm font-semibold text-white shadow-sm transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingTable
                    ? "Save changes"
                    : "Create table"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default Tables;