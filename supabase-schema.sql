-- Supabase Schema for Bug Tracker Application
-- Run this in your Supabase SQL Editor

-- Drop existing tables if they exist
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS project_members CASCADE;
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create users table
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT,
  role TEXT DEFAULT 'developer' CHECK (role IN ('admin', 'manager', 'developer', 'viewer')),
  avatar TEXT,
  google_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- Create projects table
CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create project_members table
CREATE TABLE project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'developer' CHECK (role IN ('admin', 'manager', 'developer', 'viewer')),
  UNIQUE(project_id, user_id)
);

-- Create tickets table
CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  status TEXT DEFAULT 'Todo' CHECK (status IN ('Todo', 'InProgress', 'Done')),
  assignee_id UUID REFERENCES users(id) ON DELETE SET NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  "order" INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create comments table
CREATE TABLE comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  parent_comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_tickets_project_id ON tickets(project_id);
CREATE INDEX idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_comments_ticket_id ON comments(ticket_id);
CREATE INDEX idx_comments_parent_comment_id ON comments(parent_comment_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies for users table
-- Allow anyone to insert (for registration)
CREATE POLICY "Allow insert for all users" ON users
  FOR INSERT WITH CHECK (true);

-- Allow users to read all users
CREATE POLICY "Allow read for all users" ON users
  FOR SELECT USING (true);

-- Allow users to update their own profile
CREATE POLICY "Allow update for own profile" ON users
  FOR UPDATE USING (auth.uid() = id OR auth.role() = 'service_role');

-- Create RLS Policies for projects table
CREATE POLICY "Allow all operations on projects" ON projects
  FOR ALL USING (true);

-- Create RLS Policies for project_members table
CREATE POLICY "Allow all operations on project_members" ON project_members
  FOR ALL USING (true);

-- Create RLS Policies for tickets table
CREATE POLICY "Allow all operations on tickets" ON tickets
  FOR ALL USING (true);

-- Create RLS Policies for comments table
CREATE POLICY "Allow all operations on comments" ON comments
  FOR ALL USING (true);

-- Insert a default admin user (password: admin123)
INSERT INTO users (name, email, password, role) VALUES 
  ('Admin User', 'admin@bugtracker.com', '$2a$10$rQZ8N3YqX9KZ8N3YqX9KZOeJ9J9J9J9J9J9J9J9J9J9J9J9J9J9J9J', 'admin');