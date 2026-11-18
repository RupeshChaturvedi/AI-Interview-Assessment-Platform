import {
  Clock,
  Check,
  FileText,
  Info,
  ArrowRight
} from "lucide-react";

const activities = [
  {
    title: "Interview Completed",
    description: "Technical Interview • 5 Questions",
    time: "Today, 2:30 PM",
    score: "Score: 82%",
    icon: Check,
    color: "activity-green"
  },
  {
    title: "Resume Analyzed",
    description: "Skills & Projects Extracted",
    time: "Today, 1:15 PM",
    icon: FileText,
    color: "activity-purple"
  },
  {
    title: "Feedback Generated",
    description: "Check your detailed report",
    time: "Today, 1:14 PM",
    icon: Info,
    color: "activity-blue"
  }
];

function RecentActivity() {

  return (
    <div className="recent-activity-card">

      <div className="activity-heading">

        <div>
          <Clock size={30} color="#818CF8" />
          <h2>Recent Activity</h2>
        </div>

        <button className="view-all-btn">
          View All <ArrowRight size={16} />
        </button>

      </div>

      <div className="activity-list">

        {activities.map((activity) => {

          const Icon = activity.icon;

          return (
            <div className="activity-item" key={activity.title}>

              <div className={`activity-icon ${activity.color}`}>
                <Icon size={23} />
              </div>

              <div className="activity-details">

                <h4>{activity.title}</h4>

                <p>{activity.description}</p>

              </div>

              <div className="activity-meta">

                {activity.score && (
                  <strong>{activity.score}</strong>
                )}

                <span>{activity.time}</span>

              </div>

            </div>
          );
        })}

      </div>

    </div>
  );
}

export default RecentActivity;