import { useEffect, useMemo, useRef, useState } from "react";
import api from "../../services/api";

const categories = [
  "All",
  "Starters",
  "Main Course",
  "Sides",
  "Desserts",
  "Drinks",
  "Cocktails",
];

const animationTypes = [
  {
    value: "none",
    label: "None — Standard",
  },
  {
    value: "drink",
    label: "Drink",
  },
  {
    value: "pasta",
    label: "Pasta",
  },
  {
    value: "burger",
    label: "Burger",
  },
  {
    value: "pizza",
    label: "Pizza",
  },
  {
    value: "dessert",
    label: "Dessert",
  },
  {
    value: "salad",
    label: "Salad",
  },
  {
    value: "chicken",
    label: "Chicken",
  },
];

const emptyForm = {
  name: "",
  description: "",
  category: "Main Course",
  price: "",
  animationType: "none",
};

const Menu = () => {
  const [menuItems, setMenuItems] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] =
    useState("All");

  const [showModal, setShowModal] =
    useState(false);

  const [editingItem, setEditingItem] =
    useState(null);

  const [form, setForm] =
    useState(emptyForm);

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const fileInputRef = useRef(null);

  // ==========================================
  // FETCH MENU
  // ==========================================

  const fetchMenu = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get("/menu");

      setMenuItems(
        response.data.menuItems || []
      );
    } catch (err) {
      console.error(
        "Fetch menu error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to load menu."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  // ==========================================
  // FILTER MENU
  // ==========================================

  const filteredItems = useMemo(() => {
    const query =
      search.trim().toLowerCase();

    return menuItems.filter((item) => {
      const matchesSearch =
        !query ||
        item.name
          ?.toLowerCase()
          .includes(query) ||
        item.description
          ?.toLowerCase()
          .includes(query) ||
        item.category
          ?.toLowerCase()
          .includes(query);

      const matchesCategory =
        categoryFilter === "All" ||
        item.category === categoryFilter;

      return (
        matchesSearch &&
        matchesCategory
      );
    });
  }, [
    menuItems,
    search,
    categoryFilter,
  ]);

  // ==========================================
  // STATS
  // ==========================================

  const totalItems = menuItems.length;

  const availableItems =
    menuItems.filter(
      (item) => item.isAvailable
    ).length;

  const unavailableItems =
    menuItems.filter(
      (item) => !item.isAvailable
    ).length;

  // ==========================================
  // OPEN CREATE MODAL
  // ==========================================

  const openCreateModal = () => {
    setEditingItem(null);
    setForm({
      ...emptyForm,
    });
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

  const openEditModal = (item) => {
    setEditingItem(item);

    setForm({
      name: item.name || "",
      description:
        item.description || "",
      category:
        item.category || "Main Course",
      price:
        item.price !== undefined
          ? String(item.price)
          : "",
      animationType:
        item.animationType || "none",
    });

    setSelectedImage(null);
    setImagePreview(item.image || "");

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
    setEditingItem(null);
    setForm({
      ...emptyForm,
    });
    setSelectedImage(null);
    setImagePreview("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==========================================
  // FORM CHANGE
  // ==========================================

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ==========================================
  // IMAGE CHANGE
  // ==========================================

  const handleImageChange = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Please select a JPG, PNG or WebP image."
      );

      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError(
        "Image must be smaller than 5MB."
      );

      event.target.value = "";
      return;
    }

    setError("");
    setSelectedImage(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const category =
      form.category.trim();
    const description =
      form.description.trim();

    const price = Number(form.price);

    if (!name) {
      setError(
        "Menu item name is required."
      );
      return;
    }

    if (!category) {
      setError(
        "Menu item category is required."
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      setError(
        "Please enter a valid price."
      );
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append(
        "name",
        name
      );

      formData.append(
        "description",
        description
      );

      formData.append(
        "category",
        category
      );

      formData.append(
        "price",
        String(price)
      );

      formData.append(
        "animationType",
        form.animationType || "none"
      );

      if (selectedImage) {
        formData.append(
          "image",
          selectedImage
        );
      }

      if (editingItem) {
        await api.put(
          `/menu/${editingItem._id}`,
          formData
        );

        setSuccess(
          "Menu item updated successfully."
        );
      } else {
        await api.post(
          "/menu",
          formData
        );

        setSuccess(
          "Menu item added successfully."
        );
      }

      await fetchMenu();

      setTimeout(() => {
        closeModal();
      }, 500);
    } catch (err) {
      console.error(
        "Save menu item error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to save menu item."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DELETE
  // ==========================================

  const handleDelete = async (item) => {
    const confirmed =
      window.confirm(
        `Delete "${item.name}" from the menu?`
      );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await api.delete(
        `/menu/${item._id}`
      );

      setMenuItems((current) =>
        current.filter(
          (menuItem) =>
            menuItem._id !== item._id
        )
      );

      setSuccess(
        "Menu item deleted successfully."
      );

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error(
        "Delete menu item error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Failed to delete menu item."
      );
    }
  };

  // ==========================================
  // TOGGLE AVAILABILITY
  // ==========================================

  const handleAvailabilityToggle =
    async (item) => {
      try {
        setError("");
        setSuccess("");

        const nextAvailability =
          !item.isAvailable;

        const response =
          await api.put(
            `/menu/${item._id}/availability`,
            {
              isAvailable:
                nextAvailability,
            }
          );

        const updatedItem =
          response.data.menuItem;

        setMenuItems((current) =>
          current.map((menuItem) =>
            menuItem._id === item._id
              ? updatedItem
              : menuItem
          )
        );
      } catch (err) {
        console.error(
          "Toggle availability error:",
          err
        );

        setError(
          err.response?.data?.message ||
            "Failed to update availability."
        );
      }
    };

  // ==========================================
  // FORMAT PRICE
  // ==========================================

  const formatPrice = (price) => {
    return new Intl.NumberFormat(
      "en-NG",
      {
        style: "currency",
        currency: "NGN",
        maximumFractionDigits: 0,
      }
    ).format(price);
  };

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* HEADER */}

        <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />

              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Menu management
              </span>
            </div>

            <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
              Your menu
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
              Manage dishes, drinks, prices and
              availability from one place.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800"
          >
            <span className="text-lg leading-none">
              +
            </span>

            Add menu item
          </button>
        </section>

        {/* ALERTS */}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {success}
          </div>
        )}

        {/* STATS */}

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-500">
              Total items
            </p>

            <p className="mt-3 text-3xl font-semibold text-slate-950">
              {totalItems}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              Items on your menu
            </p>
          </div>

          <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-emerald-700">
              Available
            </p>

            <p className="mt-3 text-3xl font-semibold text-emerald-950">
              {availableItems}
            </p>

            <p className="mt-1 text-xs text-emerald-600">
              Currently being served
            </p>
          </div>

          <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 shadow-sm">
            <p className="text-sm font-medium text-amber-700">
              Unavailable
            </p>

            <p className="mt-3 text-3xl font-semibold text-amber-950">
              {unavailableItems}
            </p>

            <p className="mt-1 text-xs text-amber-600">
              Temporarily hidden
            </p>
          </div>
        </section>

        {/* FILTERS */}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                ⌕
              </span>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search dishes or drinks..."
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:bg-white"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {categories.map(
                (category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() =>
                      setCategoryFilter(
                        category
                      )
                    }
                    className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-semibold transition ${
                      categoryFilter ===
                      category
                        ? "bg-slate-950 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {category}
                  </button>
                )
              )}
            </div>
          </div>
        </section>

        {/* MENU GRID */}

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map(
              (item) => (
                <div
                  key={item}
                  className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="h-56 animate-pulse bg-slate-200" />

                  <div className="space-y-3 p-5">
                    <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />

                    <div className="h-4 w-full animate-pulse rounded bg-slate-100" />

                    <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                  </div>
                </div>
              )
            )}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
              🍽
            </div>

            <h2 className="mt-5 text-xl font-semibold text-slate-950">
              {menuItems.length === 0
                ? "Your menu is empty"
                : "No matching items"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
              {menuItems.length === 0
                ? "Add your first dish or drink to start building your restaurant menu."
                : "Try changing your search or category filter."}
            </p>

            {menuItems.length === 0 && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-6 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Add your first item
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredItems.map(
              (item) => (
                <article
                  key={item._id}
                  className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-slate-900/5"
                >
                  {/* IMAGE */}

                  <div className="relative h-56 overflow-hidden bg-slate-100">
                    {item.image ? (
                      <img
                        src={item.image}
                        alt={item.name}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200">
                        <span className="text-5xl">
                          🍽
                        </span>
                      </div>
                    )}

                    <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                      <span className="rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur">
                        {item.category}
                      </span>

                      {item.animationType &&
                        item.animationType !==
                          "none" && (
                          <span className="rounded-full bg-purple-600/90 px-3 py-1.5 text-xs font-semibold capitalize text-white shadow-sm backdrop-blur">
                            {item.animationType} experience
                          </span>
                        )}
                    </div>

                    <div className="absolute right-4 top-4">
                      <span
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold shadow-sm backdrop-blur ${
                          item.isAvailable
                            ? "bg-emerald-500/90 text-white"
                            : "bg-slate-900/80 text-white"
                        }`}
                      >
                        {item.isAvailable
                          ? "Available"
                          : "Unavailable"}
                      </span>
                    </div>
                  </div>

                  {/* CONTENT */}

                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <h2 className="truncate text-lg font-semibold text-slate-950">
                          {item.name}
                        </h2>

                        <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
                          {item.description ||
                            "No description added."}
                        </p>
                      </div>

                      <span className="shrink-0 text-sm font-bold text-slate-950">
                        {formatPrice(
                          item.price
                        )}
                      </span>
                    </div>

                    {/* ACTIONS */}

                    <div className="mt-5 flex items-center gap-2 border-t border-slate-100 pt-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleAvailabilityToggle(
                            item
                          )
                        }
                        className={`flex-1 rounded-xl px-3 py-2.5 text-xs font-semibold transition ${
                          item.isAvailable
                            ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                        }`}
                      >
                        {item.isAvailable
                          ? "Available"
                          : "Unavailable"}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          openEditModal(
                            item
                          )
                        }
                        className="rounded-xl bg-slate-100 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-200"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleDelete(item)
                        }
                        className="rounded-xl bg-red-50 px-3 py-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              )
            )}
          </div>
        )}
      </div>

      {/* ======================================
          CREATE / EDIT MODAL
      ======================================= */}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">

            {/* MODAL HEADER */}

            <div className="flex items-start justify-between border-b border-slate-100 p-6 sm:p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Menu item
                </p>

                <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                  {editingItem
                    ? "Edit item"
                    : "Add new item"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  Add the details customers will
                  see on your menu.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
              >
                ×
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-6 p-6 sm:p-7"
            >
              {/* IMAGE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Menu image
                </label>

                <div
                  onClick={() =>
                    fileInputRef.current?.click()
                  }
                  className="group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 transition hover:border-slate-400 hover:bg-slate-100"
                >
                  {imagePreview ? (
                    <div className="relative h-64">
                      <img
                        src={imagePreview}
                        alt="Menu preview"
                        className="h-full w-full object-cover"
                      />

                      <div className="absolute inset-0 flex items-center justify-center bg-slate-950/40 opacity-0 transition group-hover:opacity-100">
                        <span className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-900">
                          Change image
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-56 flex-col items-center justify-center px-6 text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                        ↑
                      </div>

                      <p className="mt-4 text-sm font-semibold text-slate-800">
                        Upload menu image
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        JPG, PNG or WebP · Max 5MB
                      </p>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              {/* NAME */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Item name
                </label>

                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Jollof Rice & Grilled Chicken"
                  maxLength={120}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              {/* CATEGORY + PRICE */}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Category
                  </label>

                  <select
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                  >
                    {categories
                      .filter(
                        (category) =>
                          category !== "All"
                      )
                      .map(
                        (category) => (
                          <option
                            key={category}
                            value={category}
                          >
                            {category}
                          </option>
                        )
                      )}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-800">
                    Price
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
                      ₦
                    </span>

                    <input
                      type="number"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      min="0"
                      step="1"
                      placeholder="12500"
                      className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-9 pr-4 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                    />
                  </div>
                </div>
              </div>

              {/* ANIMATION TYPE */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Visual experience
                </label>

                <select
                  name="animationType"
                  value={
                    form.animationType
                  }
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                >
                  {animationTypes.map(
                    (animation) => (
                      <option
                        key={
                          animation.value
                        }
                        value={
                          animation.value
                        }
                      >
                        {animation.label}
                      </option>
                    )
                  )}
                </select>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  This determines the visual
                  experience customers will
                  eventually see when they open
                  this menu item.
                </p>
              </div>

              {/* DESCRIPTION */}

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-800">
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={4}
                  maxLength={500}
                  placeholder="Describe the dish, ingredients or what makes it special..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />

                <p className="mt-1 text-right text-xs text-slate-400">
                  {form.description.length}/500
                </p>
              </div>

              {/* MODAL ERROR */}

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {/* ACTIONS */}

              <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Saving..."
                    : editingItem
                    ? "Save changes"
                    : "Add menu item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;
