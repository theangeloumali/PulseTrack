"use client";

import { useAuthStore } from "@/lib/stores/auth";
import type { AuthState } from "@/lib/stores/auth";

export function useAuth(): AuthState {
  return useAuthStore();
}

export type { CreateUserData } from "@/lib/stores/auth";
