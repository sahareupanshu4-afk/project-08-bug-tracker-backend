const { supabase } = require('../config/db');

// Project helper functions for Supabase
const Project = {
  // Create a new project
  async create(projectData) {
    const { title, description, created_by } = projectData;
    
    const { data, error } = await supabase
      .from('projects')
      .insert([
        {
          title,
          description,
          created_by,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    
    // Add creator as admin team member
    await supabase
      .from('project_members')
      .insert([
        {
          project_id: data.id,
          user_id: created_by,
          role: 'admin'
        }
      ]);
    
    return data;
  },

  // Find project by ID
  async findById(id) {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        created_by_user:users!projects_created_by_fkey(id, name, email, avatar),
        project_members(
          user_id,
          role,
          user:users(id, name, email, avatar)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all projects for a user
  async findByUser(userId) {
    // First get projects where user is a member
    const { data: memberRows, error: memberRowsError } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', userId);

    if (memberRowsError) throw memberRowsError;

    const memberProjectIds = memberRows?.map((row) => row.project_id) || [];

    // Get projects user has created
    const { data: ownedProjects, error: ownedError } = await supabase
      .from('projects')
      .select(`
        *,
        created_by_user:users!projects_created_by_fkey(id, name, email, avatar),
        project_members(
          user_id,
          role,
          user:users(id, name, email, avatar)
        )
      `)
      .eq('created_by', userId)
      .order('created_at', { ascending: false });

    if (ownedError) throw ownedError;

    // Get projects where user is member (excluding created ones to avoid duplicates)
    let memberProjects = [];
    if (memberProjectIds.length > 0) {
      const { data, error } = await supabase
        .from('projects')
        .select(`
          *,
          created_by_user:users!projects_created_by_fkey(id, name, email, avatar),
          project_members(
            user_id,
            role,
            user:users(id, name, email, avatar)
          )
        `)
        .in('id', memberProjectIds)
        .order('created_at', { ascending: false });

      if (error) throw error;

      memberProjects = data;
    }

    // Deduplicate by project id
    const allProjects = [...ownedProjects, ...memberProjects];
    const uniqueProjects = Object.values(
      allProjects.reduce((acc, project) => {
        acc[project.id] = acc[project.id] || project;
        return acc;
      }, {})
    );

    return uniqueProjects;
  },

  // Get all projects (admin)
  async findAll() {
    const { data, error } = await supabase
      .from('projects')
      .select(`
        *,
        created_by_user:users!projects_created_by_fkey(id, name, email, avatar),
        project_members(
          user_id,
          role,
          user:users(id, name, email, avatar)
        )
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Update project
  async update(id, updates) {
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete project
  async delete(id) {
    // Delete related records first
    await supabase.from('project_members').delete().eq('project_id', id);
    await supabase.from('tickets').delete().eq('project_id', id);
    
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return true;
  },

  // Add team member
  async addMember(projectId, userId, role = 'developer') {
    const { data, error } = await supabase
      .from('project_members')
      .insert([
        {
          project_id: projectId,
          user_id: userId,
          role
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Remove team member
  async removeMember(projectId, userId) {
    const { error } = await supabase
      .from('project_members')
      .delete()
      .eq('project_id', projectId)
      .eq('user_id', userId);
    
    if (error) throw error;
    return true;
  },

  // Check if user has access to project
  async hasAccess(projectId, userId) {
    const { data, error } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return !!data;
  }
};

module.exports = Project;