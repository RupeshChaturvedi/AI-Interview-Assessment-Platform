import { Bell } from "lucide-react";

const Topbar = () => {

  return (
    <header className="topbar">

      <div className="welcome-text">
        <h1>Hello, Rupesh! 👋</h1>

        <p>
          Let's enhance your interview skills with AI
        </p>
      </div>

      <div className="topbar-right">

        <div className="notification">
          <Bell size={23} />
          <span className="notification-dot"></span>
        </div>

        <div className="profile-avatar">
          RC
        </div>

      </div>

    </header>
  );
};

export default Topbar;