-- Add foreign key constraint for community_posts -> user_profiles
-- This enables Supabase relationship queries like user_profile:user_id
ALTER TABLE community_posts
ADD CONSTRAINT fk_community_posts_user_id 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(user_id) 
ON DELETE CASCADE;

-- Add foreign key constraint for posts_comments -> user_profiles
ALTER TABLE posts_comments
ADD CONSTRAINT fk_posts_comments_user_id 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(user_id) 
ON DELETE CASCADE;

-- Add foreign key constraint for posts_likes -> user_profiles
ALTER TABLE posts_likes
ADD CONSTRAINT fk_posts_likes_user_id 
FOREIGN KEY (user_id) 
REFERENCES user_profiles(user_id) 
ON DELETE CASCADE;

-- Add foreign key constraint for posts_likes -> community_posts
ALTER TABLE posts_likes
ADD CONSTRAINT fk_posts_likes_post_id 
FOREIGN KEY (post_id) 
REFERENCES community_posts(id) 
ON DELETE CASCADE;

-- Add foreign key constraint for posts_comments -> community_posts
ALTER TABLE posts_comments
ADD CONSTRAINT fk_posts_comments_post_id 
FOREIGN KEY (post_id) 
REFERENCES community_posts(id) 
ON DELETE CASCADE;
