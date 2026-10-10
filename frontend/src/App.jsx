import { Routes, Route } from "react-router-dom";

// =========================
// AUTH PAGES
// =========================
import Login from "./pages/Login";
import Register from "./pages/Register";

// =========================
// PUBLIC PAGES
// =========================
import Home from "./pages/Home";
import Restaurants from "./pages/Restaurants";
import Restaurant from "./pages/Restaurant";
import Menus from "./pages/Menu";
import MenuItem from "./pages/MenuItem";

// =========================
// CUSTOMER PAGES
// =========================
import Reservation from "./pages/Reservation";
import MyReservations from "./pages/MyReservations";

// =========================
// RESTAURANT DASHBOARD
// =========================
import Dashboard from "./pages/dashboard/Dashboard";
import RestaurantSettings from "./pages/dashboard/RestaurantSettings";
import Tables from "./pages/dashboard/Tables";
import Menu from "./pages/dashboard/Menu";
import Reservations from "./pages/Reservations";

// =========================
// LAYOUTS / PROTECTION
// =========================
import PublicLayout from "./components/PublicLayout";
import DashboardLayout from "./components/dashboard/DashboardLayout";
import ProtectedRoute from "./components/ProtectedRoute";

const App = () => {
  return (
    <Routes>

      {/* =====================================================
          PUBLIC ROUTES
          Anyone can access these
      ===================================================== */}
      <Route element={<PublicLayout />}>

        {/* Home */}
        <Route
          path="/"
          element={<Home />}
        />

        {/* Restaurants */}
        <Route
          path="/restaurants"
          element={<Restaurants />}
        />

        {/* Restaurant details */}
        <Route
          path="/restaurants/:id"
          element={<Restaurant />}
        />

        {/* All restaurants / menu browsing */}
        <Route
          path="/menu"
          element={<Menus />}
        />

        {/* Specific restaurant menu */}
        <Route
          path="/menu/:restaurantId"
          element={<Menus />}
        />

        {/* Specific menu item */}
        <Route
          path="/menu/:restaurantId/item/:menuItemId"
          element={<MenuItem />}
        />

      </Route>


      {/* =====================================================
          AUTH ROUTES
      ===================================================== */}
      <Route
        path="/login"
        element={<Login />}
      />

      <Route
        path="/register"
        element={<Register />}
      />


      {/* =====================================================
          CUSTOMER PROTECTED ROUTES
          Only logged-in customers can access these
      ===================================================== */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={["customer"]}
          />
        }
      >

        <Route element={<PublicLayout />}>

          {/* Reserve a table */}
          <Route
            path="/restaurants/:id/reserve"
            element={<Reservation />}
          />

          {/* Customer's reservations */}
          <Route
            path="/reservations"
            element={<MyReservations />}
          />

        </Route>

      </Route>


      {/* =====================================================
          RESTAURANT PROTECTED ROUTES
          Only restaurant owners can access these
      ===================================================== */}
      <Route
        element={
          <ProtectedRoute
            allowedRoles={["restaurant"]}
          />
        }
      >

        <Route
          path="/dashboard"
          element={<DashboardLayout />}
        >

          {/* /dashboard */}
          <Route
            index
            element={<Dashboard />}
          />

          {/* /dashboard/reservations */}
          <Route
            path="reservations"
            element={<Reservations />}
          />

          {/* /dashboard/restaurant */}
          <Route
            path="restaurant"
            element={<RestaurantSettings />}
          />

          {/* /dashboard/tables */}
          <Route
            path="tables"
            element={<Tables />}
          />

          {/* /dashboard/menu */}
          <Route
            path="menu"
            element={<Menu />}
          />

        </Route>

      </Route>

    </Routes>
  );
};

export default App;