import type { MediaAttachment, Message, NearbyStory, Story, User, UserMatch } from '../shared/types';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api';

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as { message?: string };
    throw new Error(payload.message ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function getHealth(): Promise<{ status: string; service: string }> {
  return request('/health');
}

export async function listUsers(): Promise<User[]> {
  return request('/users');
}

export async function searchUsers(query: string, lat?: number, lng?: number): Promise<UserMatch[]> {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set('query', query.trim());
  }
  if (typeof lat === 'number') {
    params.set('lat', String(lat));
  }
  if (typeof lng === 'number') {
    params.set('lng', String(lng));
  }

  return request(`/users/search?${params.toString()}`);
}

export async function createUser(payload: {
  name: string;
  email: string;
  city: string;
  bio?: string;
  avatarUrl?: string;
  lat?: number;
  lng?: number;
}): Promise<User> {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(
  id: string,
  payload: Partial<Omit<User, 'id' | 'createdAt'>>,
): Promise<User> {
  return request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
}

export async function deleteUser(id: string): Promise<void> {
  await request(`/users/${id}`, {
    method: 'DELETE',
  });
}

export async function connectFriends(userId: string, friendId: string): Promise<unknown> {
  return request(`/users/${userId}/friends`, {
    method: 'POST',
    body: JSON.stringify({ friendId }),
  });
}

export async function listMessages(): Promise<Message[]> {
  return request('/messages');
}

export async function sendMessage(payload: {
  senderId: string;
  recipientIds: string[];
  text: string;
  attachments?: MediaAttachment[];
}): Promise<Message> {
  return request('/messages', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function listStories(lat?: number, lng?: number, radiusKm = 40): Promise<NearbyStory[]> {
  const params = new URLSearchParams();
  if (typeof lat === 'number') {
    params.set('lat', String(lat));
  }
  if (typeof lng === 'number') {
    params.set('lng', String(lng));
  }
  params.set('radiusKm', String(radiusKm));

  return request(`/stories?${params.toString()}`);
}

export async function createStory(payload: {
  authorId: string;
  text: string;
  media?: Story['media'];
  lat?: number;
  lng?: number;
}): Promise<Story> {
  return request('/stories', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function fileToAttachment(file: File): Promise<MediaAttachment> {
  const url = await fileToDataUrl(file);
  return {
    type: file.type.startsWith('video/') ? 'video' : 'image',
    url,
    name: file.name,
  };
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(String(reader.result ?? ''));
    };
    reader.onerror = () => {
      reject(new Error('Impossible de lire le fichier.'));
    };
    reader.readAsDataURL(file);
  });
}
