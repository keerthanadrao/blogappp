# Goal Description

Develop a responsive, multi-author Blog Application featuring an Instagram-like chronological scrolling feed. 
- **Users**: Admin (separate signup, manages categories and can delete any post) and Registered Readers (open signup, can create/draft/publish/edit/delete their own posts, comment, reply with deep nesting, and like posts).
- **Core Features**: 
  - Chronological feed displaying full-length blog posts.
  - Comments hidden behind an icon, supporting nested replies.
  - Likes system showing total count and a list of users who liked the post.
  - Seamless editing (no "edited" labels).
  - Draft and publish functionality for authors.
  - Predefined categories managed by the Admin.

## User Review Required

> [!IMPORTANT]
> **Technology Stack Selection**: During the ideation phase, we strictly avoided discussing technology. Since we are now moving to implementation, we need to finalize the tech stack. 
> I propose using **Next.js** (React) as the full-stack framework, **Vanilla CSS** (as per core guidelines) for maximum styling control to create a premium design, and **SQLite** or **PostgreSQL** for the database. Please confirm your preferred stack before we begin coding.

> [!IMPORTANT]
> **Design System**: The application requires a premium, dynamic UI with modern typography, smooth gradients, and micro-animations to create a visually stunning experience. We will avoid generic designs.

## Open Questions

- What database technology would you prefer to use for this assignment?
- Are there any specific color palettes, themes (e.g., dark mode by default), or typography you want to incorporate into the premium design?

## Proposed Architecture

### Database Schema (High-Level)
- **User**: `id`, `email`, `password_hash`, `role` (ADMIN | READER), `name`.
- **Category**: `id`, `name`.
- **Post**: `id`, `title`, `body`, `cover_image_url`, `author_id`, `category_id`, `status` (DRAFT | PUBLISHED), `created_at`, `updated_at`.
- **Comment**: `id`, `post_id`, `author_id`, `parent_comment_id` (for deep nesting), `content`, `created_at`, `updated_at`.
- **Like**: `post_id`, `user_id`, `created_at`.

### Frontend Pages / Routes
- `/`: The main chronological feed (accessible to anonymous users, shows logged-in users and full-length posts).
- `/login`, `/signup`: Standard authentication pages.
- `/admin/signup`: Dedicated admin registration page.
- `/post/new`: Editor to create and draft/publish a new blog post.
- `/post/[id]/edit`: Editor to modify an existing post.
- `/admin/categories`: Admin-only page to manage the predefined category list.

### UI Components
- **Feed**: Continuous scrollable list of `PostCard` components.
- **PostCard**: Displays author info, full post body, like button (with count and visible user list), and a comment icon.
- **CommentSection**: Expandable section or modal displaying deeply nested comments and reply inputs.
- **Navbar**: Navigation, login/signup links, and role-based actions (e.g., 'Create Post' for Readers, 'Manage Categories' for Admin).

## Verification Plan

### Automated Tests
- N/A for initial build unless specified; we will focus on manual end-to-end testing.

### Manual Verification
- Deploying the app locally and testing the workflows:
  - Admin sign-up vs Reader sign-up.
  - Creating, drafting, and publishing a post as a Reader.
  - Liking a post and verifying the visible list of users.
  - Replying to comments and verifying deep nesting.
  - Logging in as Admin to delete a user's post.
