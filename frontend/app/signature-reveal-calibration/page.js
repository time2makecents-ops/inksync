import SignatureRevealCalibrationScreen from "../components/SignatureRevealCalibrationScreen";

export const metadata = {
  title: "Signature Reveal Calibration",
  description: "Calibrate the BoB signature overlay against sampled magician frames.",
};

export default function SignatureRevealCalibrationPage() {
  return <SignatureRevealCalibrationScreen />;
}
