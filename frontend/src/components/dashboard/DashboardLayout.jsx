import { Outlet } from "react-router-dom";

import DashboardSidebar from "./DashboardSidebar";

const DashboardLayout = () => {
  return (
    <div className="tf-dashboard">
      <DashboardSidebar />

      <main className="tf-dashboard-main">
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;