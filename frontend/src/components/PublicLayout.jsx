import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

const PublicLayout = () => {
  return (
    <div className="relative">
      <Navbar />
      <Outlet />
    </div>
  );
};

export default PublicLayout;