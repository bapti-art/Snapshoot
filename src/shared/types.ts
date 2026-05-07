export type MediaType = 'image' | 'video';

export type MediaAttachment = {
  type: MediaType;
  url: string;
  name: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  city: string;
  bio: string;
  avatarUrl: string;
  lat: number;
  lng: number;
  friends: string[];
  createdAt: string;
};

export type Message = {
  id: string;
  senderId: string;
  recipientIds: string[];
  text: string;
  attachments: MediaAttachment[];
  createdAt: string;
};

export type Story = {
  id: string;
  authorId: string;
  text: string;
  media: MediaAttachment | null;
  lat: number;
  lng: number;
  createdAt: string;
};

export type AppDb = {
  users: User[];
  messages: Message[];
  stories: Story[];
};

export type NearbyStory = Story & {
  distanceKm: number;
  author: User;
};

export type UserMatch = User & {
  distanceKm: number;
};
