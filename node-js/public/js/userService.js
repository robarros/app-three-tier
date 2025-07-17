// User service for making API calls
const userService = {
  // Get all users
  getUsers: async (page = 1, limit = 10) => {
    try {
      const response = await fetch(`/api/users/?skip=${(page - 1) * limit}&limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch users');
      
      const data = await response.json();
      console.log('API Response:', data);
      return {
        items: Array.isArray(data) ? data : [],
        total: data.length
      };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  // Search users by name or email
  searchUsers: async (searchTerm = "", page = 1, limit = 10) => {
    try {
      const response = await fetch(`/api/users/search/?search=${encodeURIComponent(searchTerm)}&skip=${(page - 1) * limit}&limit=${limit}`);
      if (!response.ok) throw new Error('Failed to search users');
      
      const data = await response.json();
      console.log('Search API Response:', data);
      return {
        items: Array.isArray(data) ? data : [],
        total: data.length
      };
    } catch (error) {
      console.error('Error searching users:', error);
      throw error;
    }
  },

  // Get user by ID
  getUser: async (id) => {
    const response = await fetch(`/api/users/${id}`);
    if (!response.ok) throw new Error('Failed to fetch user');
    return response.json();
  },

  // Create new user
  createUser: async (userData) => {
    const response = await fetch('/api/users/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw { response: { data: errorData } };
    }
    
    return response.json();
  },

  // Update user
  updateUser: async (id, userData) => {
    const response = await fetch(`/api/users/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw { response: { data: errorData } };
    }
    
    return response.json();
  },

  // Delete user
  deleteUser: async (id) => {
    const response = await fetch(`/api/users/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw { response: { data: errorData } };
    }
    
    return response.json();
  },
};
