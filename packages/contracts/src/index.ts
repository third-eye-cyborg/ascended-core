/**
 * @third-eye-cyborg/contracts
 *
 * Platform-neutral domain contract types (pure types plus small runtime
 * validators/guards; no I/O) across the platform's bounded contexts.
 */

// identity
export {
  PresenceStatus,
  isAccount,
  isIdentityProfile,
  isPresenceStatus,
  isPresenceRecord,
} from "./identity";
export type { Account, IdentityProfile, PresenceRecord } from "./identity";

// content
export {
  ContentVisibility,
  ModerationState,
  isContentVisibility,
  isMediaAttachment,
  isPost,
  isComment,
  isReaction,
  isBookmark,
  isModerationState,
  isModerationSurface,
} from "./content";
export type {
  MediaKind,
  MediaAttachment,
  Post,
  Comment,
  Reaction,
  Bookmark,
  ModerationSurface,
} from "./content";

// community
export {
  isCommunity,
  isChannel,
  isRole,
  isMembership,
  isInvite,
} from "./community";
export type {
  Community,
  ChannelKind,
  Channel,
  Role,
  Membership,
  Invite,
} from "./community";

// conversation
export {
  MessageDeliveryState,
  isConversation,
  isMessageDeliveryState,
  isMessage,
} from "./conversation";
export type { ConversationKind, Conversation, Message } from "./conversation";

// events
export {
  EventKind,
  RsvpStatus,
  isEventKind,
  isCommunityEvent,
  isRsvpStatus,
  isRsvp,
  isLiveSession,
} from "./events";
export type { CommunityEvent, Rsvp, LiveSession } from "./events";

// realtime
export {
  CallSessionState,
  isRoomDescriptor,
  isRoomParticipant,
  isCallSessionState,
  isCallSession,
} from "./realtime";
export type { RoomDescriptor, RoomParticipant, CallSession } from "./realtime";

// avatar
export {
  AvatarGenerationState,
  isAvatarProfile,
  isAvatarGenerationState,
  isAvatarGeneration,
} from "./avatar";
export type { AvatarProfile, AvatarGeneration } from "./avatar";

// search
export {
  isSearchQuery,
  isSearchResult,
  isSearchResultSet,
  isRecommendationRequest,
  isRecommendationItem,
  isRecommendationResponse,
} from "./search";
export type {
  SearchQuery,
  SearchResult,
  SearchResultSet,
  RecommendationRequest,
  RecommendationItem,
  RecommendationResponse,
} from "./search";

// audit
export { isAuditEvent } from "./audit";
export type { AuditEvent } from "./audit";
