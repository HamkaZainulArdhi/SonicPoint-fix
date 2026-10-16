// Core domain: what an API endpoint is. No imports — every layer
// builds on these shapes.

export interface SourceLocation {
  file: string;
  line?: number;
  column?: number;
}

export interface Endpoint {
  method: string;
  path: string;
  sourceFile: string;
  middlewares: string[];
  validationSchemas: string[];
  controller?: string;
  sourceLocation?: SourceLocation;
}

export interface Mount {
  prefix: string;
  variableName: string;
}

/** Raw per-file facts collected from a single AST pass. */
export interface RouteFile {
  file: string;
  imports: Record<string, string>;
  mounts: Mount[];
  endpoints: Endpoint[];
}

export function endpointId(endpoint: Pick<Endpoint, "method" | "path">): string {
  return `${endpoint.method.toUpperCase()} ${endpoint.path}`;
}
