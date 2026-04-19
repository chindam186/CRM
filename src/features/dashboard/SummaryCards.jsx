import usericon from "../../assets/usericon.png";

const cards = [
  {
    title: "Total Customers",
    value: "5,423",
    badge: "+16% this month",
    icon : usericon
  },
  {
    title: "Members",
    value: "1,893",
    badge: "-1% this month",
    icon : usericon
  },
  {
    title: "Active Now",
    value: "189",
    badge: null,
    badgeTone: "",
    icon : usericon
  }
];

export default function SummaryCards() {
  return (
    <section className="summary-cards">
      {cards.map((card) => (
        <div key={card.title} className="summary-card">
          <div className="summary-icon" >
            <img src={card.icon} alt="" />
          </div>
          <div className="summary-content">
            <span>{card.title}</span>
            <strong>{card.value}</strong>
            {card.badge ? (
              <span className={`pill`}>{card.badge}</span>
            ) : null}
          </div>
        </div>
      ))}
    </section>
  );
}
