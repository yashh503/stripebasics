import axiosInstance from "./apiConfig";
import type { AuthResponse, User } from "../types";

export const authApi = {
  register: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>("/auth/register", {
      email,
      password,
    });
    return response.data;
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await axiosInstance.post<AuthResponse>("/auth/login", {
      email,
      password,
    });
    return response.data;
  },

  refreshToken: async (
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await axiosInstance.post("/auth/refresh-token", {
      refreshToken,
    });
    return response.data;
  },

  getCurrentUser: async (): Promise<User> => {
    const response = await axiosInstance.get<{ user: User }>("/auth/me");
    return response.data.user;
  },

  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
  },
};
