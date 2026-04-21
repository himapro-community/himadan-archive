export interface Channel {
  id: string
  slackId: string
  name: string
  messageCount: number
  lastMessageAt: string | null
}

export interface MessageUser {
  slackUserId: string
  displayName: string
  avatarUrl: string | null
}

export interface MessageFile {
  id: string
  slackUrl: string
  mimeType: string | null
  name: string | null
}

export interface Message {
  id: string
  slackTs: string
  text: string
  threadTs: string | null
  replyCount: number
  senderName: string | null
  user: MessageUser | null
  files: MessageFile[]
}

export interface MessagesResponse {
  items: Message[]
  nextCursor: string | null
}

export interface ThreadResponse {
  parent: Message
  items: Message[]
  nextCursor: string | null
}

export interface SearchResult extends Message {
  channelId: string
  channel: { name: string }
}

export interface SearchResponse {
  items: SearchResult[]
  nextCursor: string | null
  query: string
}

export interface HeatmapEntry {
  date: string
  count: number
}

export interface CurrentUser {
  id: string
  slackUserId: string
  displayName: string
  avatarUrl: string | null
  isApproved: boolean
}
