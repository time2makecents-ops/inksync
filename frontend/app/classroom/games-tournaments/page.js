import ClassroomLandingScreen from "../../components/ClassroomLandingScreen";

const data = {
  title: "Games & Tournaments",
  image: "/classroom/games-tournaments.png",
  description: "Games & Tournaments prepares you for competition play: managing nerves, making better decisions under pressure, and keeping your plan together across multiple games.",
  focusAreas: ["Competition Mindset", "Pressure Decisions", "Multi-Game Pacing"],
  drills: [
    { title: "Tournament Openers", copy: "Practice the first decisions that help you settle in quickly when every ball matters." },
    { title: "Pressure Recovery", copy: "Learn what to do after a bad bounce or a weak game so the next one is still playable." },
    { title: "Series Management", copy: "Think across a block of games instead of trying to force every moment into a huge score." },
  ],
  outcome: "You should leave with a steadier tournament mindset and one clearer pressure plan for the next event.",
};

export default function Page() {
  return <ClassroomLandingScreen data={data} />;
}
