export default function NavBar({ roleLabel, userName, tabs, activeTab, onTabChange, onLogout }) {
  return (
    <div className="nav-pill">
      <div className="nav-user">
        {roleLabel} &middot; <strong>{userName}</strong>
      </div>
      <div className="nav-actions">
        {tabs &&
          tabs.map((tab) => (
            <button
              key={tab.key}
              className={`nav-link ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        <button className="nav-link" onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}
