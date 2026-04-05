import ClassroomLandingScreen from "../../components/ClassroomLandingScreen";

const data = {
  title: "Repair Lab",
  image: "/classroom/repair-lab.png",
  description: "Repair Lab is where you learn the basics of keeping machines playing correctly, so you can recognize when bad results are player error and when they are machine issues.",
  focusAreas: ["Machine Health", "Common Fixes", "Playfield Awareness"],
  drills: [
    { title: "Issue Spotting", copy: "Learn to notice common signs of weak coils, bad switches, and mechanical inconsistency." },
    { title: "Basic Maintenance", copy: "Review simple upkeep steps that keep a game fair, fast, and dependable." },
    { title: "Player vs Machine", copy: "Separate real skill mistakes from problems caused by a machine that is not playing correctly." },
  ],
  outcome: "You should finish with a better eye for machine condition and more confidence in what kind of issue you are actually seeing.",
};

export default function Page() {
  return <ClassroomLandingScreen data={data} />;
}
