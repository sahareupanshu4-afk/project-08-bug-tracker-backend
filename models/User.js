const { supabase } = require('../config/db');
const bcrypt = require('bcryptjs');

// User helper functions for Supabase
const User = {
  // Create a new user
  async create(userData) {
    const { name, email, password, role = 'developer' } = userData;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          role,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Find user by email
  async findByEmail(email) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();
    
    if (error && error.code !== 'PGRST116') throw error;
    return data;
  },

  // Find user by ID
  async findById(id) {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, avatar, created_at, updated_at')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Get all users
  async findAll() {
    const { data, error } = await supabase
      .from('users')
      .select('id, name, email, role, avatar, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  // Update user
  async update(id, updates) {
    const { data, error } = await supabase
      .from('users')
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

  // Compare password
  async comparePassword(candidatePassword, hashedPassword) {
    return await bcrypt.compare(candidatePassword, hashedPassword);
  },

  // Alias for findByEmail (for compatibility)
  async findOne(query) {
    if (query && query.email) {
      return await this.findByEmail(query.email);
    }
    return null;
  }
};

module.exports = User;
