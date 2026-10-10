import { Navigate, Outlet } from "react-router-dom";

import { useAuth } from "../context/AuthContext";

const ProtectedRoute = ({ allowedRoles = [] }) => {
  const {
    user,
    loading,
    isAuthenticated,
  } = useAuth();

  // Wait until authentication state has been checked
  if (loading) {
    return (
      <div className="tf-route-loading">
        <span>Loading TableFlow...</span>
      </div>
    );
  }

  // User is not logged in
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // User is logged in but doesn't have permission
  if (
    allowedRoles.length > 0 &&
    !allowedRoles.includes(user?.role)
  ) {
    // Restaurant owners go to their dashboard
    if (user?.role === "restaurant") {
      return <Navigate to="/dashboard" replace />;
    }

    // Customers go back to the home page
    if (user?.role === "customer") {
      return <Navigate to="/" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;