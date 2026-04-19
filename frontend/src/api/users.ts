import client from './client';

export interface UserResponse {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  roleId: number;
  role: string;
  phoneNumber?: string;
  department?: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  firstName: string;
  lastName: string;
  roleId: number;
  password: string;
  phoneNumber?: string;
  department?: string;
}

export interface UpdateUserRequest {
  firstName: string;
  lastName: string;
  roleId: number;
  phoneNumber?: string;
  department?: string;
}

export const getUsers = (includeInactive = false) =>
  client.get<UserResponse[]>(`/users?includeInactive=${includeInactive}`).then(r => r.data);

export const createUser = (req: CreateUserRequest) =>
  client.post<UserResponse>('/users', req).then(r => r.data);

export const updateUser = (id: string, req: UpdateUserRequest) =>
  client.put<UserResponse>(`/users/${id}`, req).then(r => r.data);

export const deactivateUser = (id: string) =>
  client.put(`/users/${id}/deactivate`);

export const reactivateUser = (id: string) =>
  client.put(`/users/${id}/reactivate`);

export const resetPassword = (id: string, newPassword: string) =>
  client.put(`/users/${id}/reset-password`, { newPassword });
