# Shared Contract (Common Definitions)

This document defines the shared data models, types, and constants between Backend and Frontend.
It serves as the Single Source of Truth for the application's data structure.

## Enums & Constants

### ContractStatus
Status of the negotiation process.
```typescript
export enum ContractStatus {
  NEGOTIATING = 'NEGOTIATING',           // 交渉中
  WAITING_FOR_PARTNER = 'WAITING_FOR_PARTNER', // 相手の合意待ち
  AGREED = 'AGREED'                      // 合意済み
}
```

### UserRole
Permission level of a user in a contract.
```typescript
export enum UserRole {
  SIGNER = 'SIGNER', // 合意権限あり
  MEMBER = 'MEMBER'  // メンバー (編集・コメントのみ)
}
```

### InvitationStatus
Status of an invitation.
```typescript
export enum InvitationStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED'
}
```

## Data Models

### User
Represents a registered user.
```typescript
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}
```

### Contract
Core contract entity.
```typescript
export interface Contract {
  id: string;
  title: string;
  partnerName: string;
  status: ContractStatus;
  lastUpdatedAt: string; // ISO 8601
  version: string; // e.g., "v1.0"
  uploaderId: string;
}
```

### ContractVersion
History of contract file versions.
```typescript
export interface ContractVersion {
  id: string;
  contractId: string;
  versionNumber: string; // "v1.0", "v2.0"
  fileUrl: string;
  fileName: string;
  createdAt: string; // ISO 8601
  uploader: User;
  isLatest: boolean;
}
```

### ContractSummary
AI-generated summary of the contract.
```typescript
export interface ContractSummary {
  contractId: string;
  keyPoints: string[]; // 3 bullet points
  relationDiagramData?: any; // Structure for the relation diagram (TBD)
  generatedAt: string;
}
```

### TimelineEvent
Important dates extracted from the contract.
```typescript
export interface TimelineEvent {
  id: string;
  contractId: string;
  date: string; // YYYY-MM-DD
  label: string; // e.g., "Contract Start Date"
  isAutoDetected: boolean;
  isUserModified: boolean;
  isOverdue: boolean;
}
```

### RemindSetting
Settings for timeline reminders.
```typescript
export interface RemindSetting {
  contractId: string;
  isEnabled: boolean;
  timing: '1_WEEK_BEFORE' | '3_DAYS_BEFORE' | 'ON_THE_DAY';
}
```

### ChatMessage
A message in the negotiation chat.
```typescript
export interface ChatMessage {
  id: string;
  contractId: string;
  sender: User;
  content: string;
  sentAt: string; // ISO 8601
}
```

### Comment
A comment anchored to a specific text in the contract.
```typescript
export interface Comment {
  id: string;
  contractId: string;
  versionId: string; // Comment is tied to a specific version
  author: User;
  content: string;
  highlightRange: {
    startOffset: number;
    endOffset: number;
    text: string;
  };
  createdAt: string;
  resolved: boolean;
  replies: CommentReply[];
}

export interface CommentReply {
  id: string;
  commentId: string;
  author: User;
  content: string;
  createdAt: string;
}
```

### Invitation
Invitation to join a contract negotiation.
```typescript
export interface Invitation {
  id: string;
  contractId: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  invitedBy: string; // User ID
  invitedAt: string;
}
```

## API Request/Response Types

### ContractListResponse
Response for `GET /contracts`.
```typescript
export interface ContractListResponse {
  contracts: Contract[];
  totalCount: number;
}
```

### UploadContractRequest
Request for `POST /contracts/upload`.
```typescript
// Multipart form data
export interface UploadContractRequest {
  file: File;
  title?: string;
}
```

### ContractDetailResponse
Response for `GET /contracts/:id`.
```typescript
export interface ContractDetailResponse extends Contract {
  versions: ContractVersion[];
  currentUserRole: UserRole;
}
```
