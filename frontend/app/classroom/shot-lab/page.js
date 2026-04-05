import ClassroomLandingScreen from "../../components/ClassroomLandingScreen";

const data = {
  title: "Shot Lab",
  image: "/classroom/shot-lab.png",
  description: "Shot Lab is where you break down aiming, release timing, and repeatable shot control before you take those reps back to a live machine.",
  focusAreas: ["Release Timing", "Shot Repeatability", "Control First"],
  drills: [
    { title: "Single Shot Reps", copy: "Repeat one high-value shot until the timing feels predictable instead of rushed." },
    { title: "Control Into Shot", copy: "Practice the gather before the shot so the release starts from a calmer position." },
    { title: "Miss Pattern Review", copy: "Track whether misses are early, late, or tip-based so you know what to correct next." },
  ],
  outcome: "You should leave with one more reliable shot pattern and a clearer sense of what your misses actually look like.",
};

export default function Page() {
  return <ClassroomLandingScreen data={data} />;
}
