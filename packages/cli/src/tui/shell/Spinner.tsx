// Animated interim indicator for async REPL runs (/test, /report).
// Amber spinner (theme) + white label. Lives only while the run is in
// flight — ReplApp replaces it with the real result lines on completion,
// so it never leaks into the transcript.

import { useEffect, useState } from "react";
import { Text } from "ink";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export function SpinnerLine({ label }: { label: string }) {
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setFrame((current) => (current + 1) % FRAMES.length), 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text>
      <Text color="yellow">{FRAMES[frame]} </Text>
      <Text color="white">{label}</Text>
    </Text>
  );
}
