import navIcon from "../../assets/3d-square.png";

const navItems = [
  "Dashboard",
  "Product",
  "Customers",
  "Income",
  "Promote",
  "Help"
];

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">CRM Dashboard</div>
      <nav className="sidebar-nav">
        {navItems.map((item) => (
          <button
            key={item}
            className={`sidebar-item${item === "Dashboard" ? " active" : ""}`}
          >
            <img className="sidebar-icon" src={navIcon} alt="" />
            {item}
          </button>
        ))}
      </nav>
    </aside>
  );
}
