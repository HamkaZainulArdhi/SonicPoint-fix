// REPL banner — presentational only. All data comes in via props;
// this component never touches the scanner, config, or console.

import { Box, Text } from "ink";

export interface HomeProps {
  projectName: string;
  projectSlug: string;
  framework: string;
}

export function Home({ projectName, projectSlug, framework }: HomeProps) {
  return (
    <Box
      borderStyle="round"
      borderColor="yellow"
      paddingX={2}
      paddingY={1}
      flexDirection="row"
    >
      <Box
        width="48%"
        alignItems="center"
        justifyContent="center"
        flexDirection="column"
        paddingX={1}
      >
        <Text bold>
          <Text color="yellow">SONIC</Text>
          <Text color="white"> ⚡︎</Text>
          <Text color="yellow">POINT</Text>
        </Text>
        <Text color="yellow">API request intelligence</Text>
        <Text dimColor>Project workspace</Text>
        <Text>
          <Text bold color="white">{projectName}</Text>{" "}
          <Text dimColor>({projectSlug})</Text>
        </Text>
        <Text dimColor>{framework} project</Text>
      </Box>
      <Box
        borderStyle="single"
        borderColor="yellow"
        borderLeft
        flexDirection="column"
        paddingLeft={2}
        width="52%"
      >
        <Text bold color="yellow">
          Tips for getting started
        </Text>
        <Text color="white">Run /scan to discover endpoints</Text>
        <Text color="white">Use /schema to inspect validation schemas</Text>
        <Box
          borderStyle="single"
          borderColor="gray"
          borderTop={false}
          borderLeft={false}
          borderRight={false}
          marginY={1}
        />
        <Text bold color="yellow">
          Status
        </Text>
        <Text>
          <Text color="green">Ready</Text>{" "}
          <Text dimColor>for your next request</Text>
        </Text>
        <Text dimColor>Type / to see all commands</Text>
      </Box>
    </Box>
  );
}
