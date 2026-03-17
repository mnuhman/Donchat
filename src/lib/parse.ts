/**
 * Don Chat - Parse Server Configuration
 * Repository: https://github.com/mnuhman/Donchat.git
 */
import Parse from 'parse/node'

// Initialize Parse with Back4App credentials
Parse.initialize(
  process.env.PARSE_APP_ID || "98gc4aHIfBGS6n9IGnboPQN8EavoMSADMKmqyZlm",
  process.env.PARSE_JAVASCRIPT_KEY || "lZehvEi9Luzv9iPshdRQbS3Kq4HtRec5lDIYVzzB"
)

Parse.serverURL = process.env.PARSE_SERVER_URL || 'https://parseapi.back4app.com'

export default Parse

// Parse Object Classes
export const ParseUser = Parse.User
export const ParseObject = Parse.Object

// Custom Classes
export class User extends Parse.User {
  constructor() {
    super('_User')
  }

  get name(): string {
    return this.get('name')
  }

  set name(value: string) {
    this.set('name', value)
  }

  get email(): string {
    return this.get('email')
  }

  set email(value: string) {
    this.set('email', value)
  }

  get phone(): string | undefined {
    return this.get('phone')
  }

  set phone(value: string | undefined) {
    this.set('phone', value)
  }

  get bio(): string | undefined {
    return this.get('bio')
  }

  set bio(value: string | undefined) {
    this.set('bio', value)
  }

  get avatar(): string | undefined {
    return this.get('avatar')
  }

  set avatar(value: string | undefined) {
    this.set('avatar', value)
  }

  get isOnline(): boolean {
    return this.get('isOnline') || false
  }

  set isOnline(value: boolean) {
    this.set('isOnline', value)
  }

  get lastSeen(): Date | undefined {
    return this.get('lastSeen')
  }

  set lastSeen(value: Date | undefined) {
    this.set('lastSeen', value)
  }
}

export class Conversation extends Parse.Object {
  constructor() {
    super('Conversation')
  }

  get participants(): Parse.User[] {
    return this.get('participants') || []
  }

  set participants(value: Parse.User[]) {
    this.set('participants', value)
  }

  get lastMessage(): string | undefined {
    return this.get('lastMessage')
  }

  set lastMessage(value: string | undefined) {
    this.set('lastMessage', value)
  }
}

export class Message extends Parse.Object {
  constructor() {
    super('Message')
  }

  get content(): string {
    return this.get('content')
  }

  set content(value: string) {
    this.set('content', value)
  }

  get sender(): Parse.User {
    return this.get('sender')
  }

  set sender(value: Parse.User) {
    this.set('sender', value)
  }

  get receiver(): Parse.User | undefined {
    return this.get('receiver')
  }

  set receiver(value: Parse.User | undefined) {
    this.set('receiver', value)
  }

  get conversation(): Conversation {
    return this.get('conversation')
  }

  set conversation(value: Conversation) {
    this.set('conversation', value)
  }

  get isEdited(): boolean {
    return this.get('isEdited') || false
  }

  set isEdited(value: boolean) {
    this.set('isEdited', value)
  }

  get deletedAt(): Date | undefined {
    return this.get('deletedAt')
  }

  set deletedAt(value: Date | undefined) {
    this.set('deletedAt', value)
  }
}

// Register subclasses
Parse.Object.registerSubclass('_User', User)
Parse.Object.registerSubclass('Conversation', Conversation)
Parse.Object.registerSubclass('Message', Message)
