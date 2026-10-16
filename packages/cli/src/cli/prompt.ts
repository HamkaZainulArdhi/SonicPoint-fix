import inquirer from "inquirer";
import { AppCredentials } from "../config/app.js";

export async function askText(message: string, fallback: string): Promise<string> {
  const answer = await inquirer.prompt<{ value: string }>([
    { type: "input", name: "value", message, default: fallback },
  ]);

  return answer.value;
}

export async function askSecret(message: string, fallback: string): Promise<string> {
  const answer = await inquirer.prompt<{ value: string }>([
    { type: "password", name: "value", message, default: fallback },
  ]);

  return answer.value;
}

export async function askCredentials(existing: AppCredentials | null): Promise<AppCredentials> {
  const baseUrl = await askText("Base URL:", existing?.baseUrl ?? "http://localhost:3000");
  const loginEndpoint = await askText("Login endpoint:", existing?.loginEndpoint ?? "/api/auth/login");
  const email = await askText("Email:", existing?.email ?? "admin@example.com");
  const password = await askSecret("Password:", existing?.password ?? "");
  const tokenField = await askText("Token field path:", existing?.tokenField ?? "data.token");
  const token = await askText("Token (optional, blank = auto-login):", existing?.token ?? "");

  return {
    baseUrl,
    loginEndpoint,
    email,
    password,
    tokenField,
    token: token.trim() || undefined,
  };
}

export async function askParamValue(paramName: string): Promise<string | null> {
  const answer = await inquirer.prompt<{ value: string }>([
    { type: "input", name: "value", message: `Value for :${paramName}:` },
  ]);

  return answer.value?.trim() || null;
}
