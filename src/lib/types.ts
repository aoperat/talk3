export interface Room {
  id: number;
  name: string;
  type?: string | null;
  created_by?: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  room_id: number;
  user_id: string | null;
  content_ko: string | null;
  content_en: string | null;
  created_at: string;
}

export interface User {
  id: string;
  email?: string;
  name?: string;
  avatar_url?: string;
}

export interface Friend {
  id: string;
  user_id: string;
  friend_id: string;
  friend: User;
  created_at: string;
}

export interface FriendRequest {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: string;
  from_user?: User;
  to_user?: User;
  created_at: string;
  updated_at: string;
}

export interface RoomWithMetadata extends Room {
  lastMsg?: string;
  time?: string;
  unread?: number;
  participantIds?: string[];
}

export interface MessageWithSender extends Message {
  sender: 'me' | 'friend';
  text: string;
  textEn: string | null;
  time: string;
  senderName?: string;
  senderId?: string;
}

