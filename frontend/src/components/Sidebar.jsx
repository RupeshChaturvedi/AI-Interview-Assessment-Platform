import {
  GraduationCap,
  LayoutDashboard,
  FileText,
  Play,
  ChartNoAxesColumnIncreasing,
  UserRound,
  Settings,
  Trophy,
  LogOut
} from "lucide-react";

const Sidebar = () => {

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard },
    { name: "Upload Resume", icon: FileText },
    { name: "Start Interview", icon: Play },
    { name: "My Reports", icon: ChartNoAxesColumnIncreasing },
    { name: "Profile", icon: UserRound },
    { name: "Settings", icon: Settings }
  ];

  return (
    <aside className="sidebar">

      <div className="brand">
        <GraduationCap size={75} strokeWidth={1.8} />

        <h2>AI Smart<br />Interview</h2>

        <p>Practice • Improve • Grow</p>
      </div>

      <nav className="sidebar-menu">

        {menuItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              className={`menu-item ${index === 0 ? "active" : ""}`}
              key={item.name}
            >
              <Icon size={25} />
              <span>{item.name}</span>
            </div>
          );
        })}

      </nav>

      <div className="motivation-card">
        <Trophy size={34} color="#FFD34F" />

        <h4>Keep Going!</h4>

        <p>
          You're on the right<br />
          path to success. ✨
        </p>
      </div>

      <button className="logout-btn">
        <LogOut size={21} />
        <span>Logout</span>
      </button>

    </aside>
  );
};

export default Sidebar;