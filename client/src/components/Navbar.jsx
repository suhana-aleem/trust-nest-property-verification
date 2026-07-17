import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const isAdminSide = ["Admin", "Registrar"].includes(user?.role);
  const homePath = isAdminSide ? "/admin/dashboard" : "/dashboard";
  const roleLabelMap = {
    Admin: "Admin",
    Registrar: "Registrar",
    Seller: "Seller",
    Buyer: "Buyer"
  };

  const onLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <nav className="nav">
      <div className="nav-brand-wrap">
        <Link to={homePath} className="brand">
          TRUST NEST
        </Link>
        <span className="nav-tag">Proof for Every Property, Trust in Every Transaction.</span>
      </div>
      <div className="nav-right">
        <span className="nav-user">{user?.name} ({roleLabelMap[user?.role] || user?.role})</span>
        <button className="btn btn-danger" onClick={onLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
