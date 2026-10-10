import { useEffect, useRef, useState } from "react";
import api from "../../services/api";

const initialForm = {
  name: "",
  description: "",
  address: "",
  phone: "",
  email: "",
  cuisine: "",
};

const cuisineOptions = [
  "Nigerian",
  "African",
  "Italian",
  "Chinese",
  "Japanese",
  "Indian",
  "Mexican",
  "Mediterranean",
  "French",
  "American",
  "Fusion",
  "Other",
];

const RestaurantSettings = () => {
  const [form, setForm] =
    useState(initialForm);

  const [restaurant, setRestaurant] =
    useState(null);

  const [selectedImage, setSelectedImage] =
    useState(null);

  const [imagePreview, setImagePreview] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const fileInputRef = useRef(null);

  // ==========================================
  // LOAD RESTAURANT
  // ==========================================

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      setError("");

      const response =
        await api.get("/restaurants/my");

      const data = response.data.restaurant;

      if (data) {
        setRestaurant(data);

        setForm({
          name: data.name || "",
          description:
            data.description || "",
          address: data.address || "",
          phone: data.phone || "",
          email: data.email || "",
          cuisine: data.cuisine || "",
        });

        setImagePreview(
          data.image || ""
        );
      }
    } catch (err) {
      console.error(
        "Load restaurant error:",
        err
      );

      if (
        err.response?.status !== 404
      ) {
        setError(
          err.response?.data?.message ||
            "Unable to load restaurant profile."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRestaurant();
  }, []);

  // ==========================================
  // HANDLE INPUT
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

    setSuccess("");
    setError("");
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
    setSuccess("");

    setSelectedImage(file);

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  // ==========================================
  // REMOVE SELECTED IMAGE
  // ==========================================

  const removeSelectedImage = () => {
    setSelectedImage(null);

    setImagePreview(
      restaurant?.image || ""
    );

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ==========================================
  // SUBMIT
  // ==========================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const description =
      form.description.trim();
    const address =
      form.address.trim();
    const phone =
      form.phone.trim();
    const email =
      form.email.trim();
    const cuisine =
      form.cuisine.trim();

    if (!name) {
      setError(
        "Restaurant name is required."
      );
      return;
    }

    if (!address) {
      setError(
        "Restaurant address is required."
      );
      return;
    }

    if (!phone) {
      setError(
        "Restaurant phone number is required."
      );
      return;
    }

    try {
      setSaving(true);

      const formData = new FormData();

      formData.append("name", name);
      formData.append(
        "description",
        description
      );
      formData.append(
        "address",
        address
      );
      formData.append(
        "phone",
        phone
      );
      formData.append(
        "email",
        email
      );
      formData.append(
        "cuisine",
        cuisine
      );

      if (selectedImage) {
        formData.append(
          "image",
          selectedImage
        );
      }

      let response;

      if (restaurant) {
        response = await api.put(
          "/restaurants/my",
          formData
        );
      } else {
        response = await api.post(
          "/restaurants",
          formData
        );
      }

      const updatedRestaurant =
        response.data.restaurant;

      setRestaurant(
        updatedRestaurant
      );

      setForm({
        name:
          updatedRestaurant.name ||
          "",
        description:
          updatedRestaurant.description ||
          "",
        address:
          updatedRestaurant.address ||
          "",
        phone:
          updatedRestaurant.phone ||
          "",
        email:
          updatedRestaurant.email ||
          "",
        cuisine:
          updatedRestaurant.cuisine ||
          "",
      });

      setImagePreview(
        updatedRestaurant.image || ""
      );

      setSelectedImage(null);

      if (fileInputRef.current) {
        fileInputRef.current.value =
          "";
      }

      setSuccess(
        restaurant
          ? "Restaurant profile updated successfully."
          : "Restaurant profile created successfully."
      );
    } catch (err) {
      console.error(
        "Save restaurant error:",
        err
      );

      setError(
        err.response?.data?.message ||
          "Unable to save restaurant profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // LOADING
  // ==========================================

  if (loading) {
    return (
      <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          <div className="h-10 w-64 animate-pulse rounded-xl bg-slate-200" />

          <div className="h-5 w-96 max-w-full animate-pulse rounded-lg bg-slate-100" />

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="space-y-6">
              <div className="h-64 animate-pulse rounded-2xl bg-slate-100" />

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <section className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-8">

        {/* ======================================
            HEADER
        ======================================= */}

        <header>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />

            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Restaurant management
            </p>
          </div>

          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Restaurant settings
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            Manage the restaurant information
            customers will see on TableFlow.
          </p>
        </header>

        {/* ======================================
            ALERTS
        ======================================= */}

        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            {success}
          </div>
        )}

        {/* ======================================
            FORM
        ======================================= */}

        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm"
        >

          {/* ====================================
              RESTAURANT IMAGE
          ===================================== */}

          <div className="border-b border-slate-100 p-6 sm:p-8">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-slate-950">
                Restaurant image
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Use a strong image that represents
                your restaurant.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-[240px_1fr] md:items-center">

              {/* IMAGE PREVIEW */}

              <div className="relative h-52 overflow-hidden rounded-3xl bg-slate-100">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt={
                      form.name ||
                      "Restaurant"
                    }
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-2xl shadow-sm">
                      🍽
                    </div>

                    <span className="mt-3 text-xs font-medium text-slate-400">
                      No image selected
                    </span>
                  </div>
                )}
              </div>

              {/* IMAGE CONTROLS */}

              <div>
                <p className="text-sm font-medium text-slate-700">
                  Upload a restaurant photo
                </p>

                <p className="mt-1 max-w-md text-sm leading-6 text-slate-400">
                  JPG, PNG or WebP. Maximum file
                  size is 5MB.
                </p>

                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    {imagePreview
                      ? "Change image"
                      : "Choose image"}
                  </button>

                  {selectedImage && (
                    <button
                      type="button"
                      onClick={
                        removeSelectedImage
                      }
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                    >
                      Remove selection
                    </button>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />

                {selectedImage && (
                  <p className="mt-3 text-xs font-medium text-emerald-600">
                    New image selected:{" "}
                    {selectedImage.name}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* ====================================
              BASIC INFORMATION
          ===================================== */}

          <div className="border-b border-slate-100 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Basic information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Tell customers what your restaurant
                is about.
              </p>
            </div>

            <div className="space-y-5">

              {/* NAME */}

              <div>
                <label
                  htmlFor="restaurant-name"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Restaurant name
                </label>

                <input
                  id="restaurant-name"
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  maxLength={120}
                  placeholder="e.g. The Garden Table"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              {/* DESCRIPTION */}

              <div>
                <label
                  htmlFor="restaurant-description"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Description
                </label>

                <textarea
                  id="restaurant-description"
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={5}
                  maxLength={1000}
                  placeholder="Tell customers about your restaurant, atmosphere and experience..."
                  className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />

                <div className="mt-1 flex justify-end">
                  <span className="text-xs text-slate-400">
                    {form.description.length}/1000
                  </span>
                </div>
              </div>

              {/* CUISINE */}

              <div>
                <label
                  htmlFor="restaurant-cuisine"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Cuisine
                </label>

                <select
                  id="restaurant-cuisine"
                  name="cuisine"
                  value={form.cuisine}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                >
                  <option value="">
                    Select cuisine
                  </option>

                  {cuisineOptions.map(
                    (cuisine) => (
                      <option
                        key={cuisine}
                        value={cuisine}
                      >
                        {cuisine}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* ====================================
              CONTACT INFORMATION
          ===================================== */}

          <div className="border-b border-slate-100 p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-slate-950">
                Contact information
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Give customers reliable ways to
                reach your restaurant.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">

              {/* PHONE */}

              <div>
                <label
                  htmlFor="restaurant-phone"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Phone number
                </label>

                <input
                  id="restaurant-phone"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+234 800 000 0000"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              {/* EMAIL */}

              <div>
                <label
                  htmlFor="restaurant-email"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Email address
                </label>

                <input
                  id="restaurant-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="hello@restaurant.com"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>

              {/* ADDRESS */}

              <div className="sm:col-span-2">
                <label
                  htmlFor="restaurant-address"
                  className="mb-2 block text-sm font-semibold text-slate-800"
                >
                  Restaurant address
                </label>

                <input
                  id="restaurant-address"
                  type="text"
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  maxLength={250}
                  placeholder="12 Admiralty Way, Lekki Phase 1, Lagos"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-slate-400 focus:ring-4 focus:ring-slate-100"
                />
              </div>
            </div>
          </div>

          {/* ====================================
              SAVE BAR
          ===================================== */}

          <div className="flex flex-col gap-4 bg-slate-50 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Keep your restaurant information
                up to date.
              </p>

              <p className="mt-1 text-xs text-slate-400">
                These details will eventually appear
                on your public restaurant page.
              </p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-2xl bg-slate-950 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-slate-950/10 transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : restaurant
                ? "Save changes"
                : "Create restaurant"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
};

export default RestaurantSettings;