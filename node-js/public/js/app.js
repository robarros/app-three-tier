document.addEventListener('DOMContentLoaded', () => {
  // State
  const state = {
    users: [],
    editingUser: null,
    loading: false,
    message: { type: '', text: '' },
    pagination: {
      currentPage: 1,
      totalUsers: 0,
      usersPerPage: 10
    },
    searchTerm: '',
    isSearching: false
  };

  // DOM Elements
  const elements = {
    userForm: document.getElementById('userForm'),
    nameInput: document.getElementById('name'),
    emailInput: document.getElementById('email'),
    ageInput: document.getElementById('age'),
    usersList: document.getElementById('usersList'),
    messageArea: document.getElementById('messageArea'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    totalUsers: document.getElementById('totalUsers'),
    refreshButton: document.getElementById('refreshButton'),
    pagination: {
      container: document.getElementById('pagination'),
      firstPageBtn: document.getElementById('firstPageBtn'),
      prevPageBtn: document.getElementById('prevPageBtn'),
      nextPageBtn: document.getElementById('nextPageBtn'),
      lastPageBtn: document.getElementById('lastPageBtn'),
      pageInfo: document.getElementById('pageInfo')
    },
    templates: {
      userItem: document.getElementById('userItemTemplate'),
      editForm: document.getElementById('editFormTemplate'),
      noUsers: document.getElementById('noUsersTemplate'),
      noSearchResults: document.getElementById('noSearchResultsTemplate')
    }
  };

  // Helper Functions
  const showMessage = (type, text) => {
    state.message = { type, text };
    elements.messageArea.innerHTML = '';
    
    if (text) {
      const messageEl = document.createElement('div');
      messageEl.className = type === 'error' ? 'error-message' : 'success-message';
      messageEl.textContent = text;
      elements.messageArea.appendChild(messageEl);
      
      // Auto-hide message after 5 seconds
      setTimeout(() => {
        elements.messageArea.innerHTML = '';
        state.message = { type: '', text: '' };
      }, 5000);
    }
  };

  const setLoading = (isLoading) => {
    state.loading = isLoading;
    const buttons = document.querySelectorAll('button');
    const inputs = document.querySelectorAll('input');
    
    buttons.forEach(button => {
      button.disabled = isLoading;
    });
    
    inputs.forEach(input => {
      input.disabled = isLoading;
    });
    
    elements.refreshButton.textContent = isLoading ? '⌛' : '↻';
  };

  const updatePaginationInfo = () => {
    const totalPages = Math.ceil(state.pagination.totalUsers / state.pagination.usersPerPage);
    elements.pagination.pageInfo.textContent = `Página ${state.pagination.currentPage} de ${totalPages || 1} (${state.pagination.totalUsers} usuários)`;
    elements.totalUsers.textContent = state.pagination.totalUsers;
    
    // Update buttons state
    elements.pagination.firstPageBtn.disabled = state.pagination.currentPage === 1;
    elements.pagination.prevPageBtn.disabled = state.pagination.currentPage === 1;
    elements.pagination.nextPageBtn.disabled = state.pagination.currentPage >= totalPages;
    elements.pagination.lastPageBtn.disabled = state.pagination.currentPage >= totalPages;
  };

  // API Actions
  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers(state.pagination.currentPage, state.pagination.usersPerPage);
      state.users = data.items || [];
      
      // Get total count in a separate call for now
      const allUsers = await userService.getUsers(1, 1000000);
      state.pagination.totalUsers = allUsers.items ? allUsers.items.length : 0;
      
      renderUsersList();
      updatePaginationInfo();
    } catch (error) {
      console.error('Error loading users:', error);
      showMessage('error', 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.searchUsers(
        state.searchTerm,
        state.pagination.currentPage,
        state.pagination.usersPerPage
      );
      
      state.users = data.items || [];
      
      // Get total count of search results
      const allSearchResults = await userService.searchUsers(state.searchTerm, 1, 1000000);
      state.pagination.totalUsers = allSearchResults.items ? allSearchResults.items.length : 0;
      
      renderUsersList();
      updatePaginationInfo();
    } catch (error) {
      console.error('Error searching users:', error);
      showMessage('error', 'Erro ao buscar usuários');
    } finally {
      setLoading(false);
    }
  };

  const createUser = async (userData) => {
    try {
      setLoading(true);
      await userService.createUser({
        name: userData.name,
        email: userData.email,
        age: parseInt(userData.age)
      });
      
      showMessage('success', 'Usuário criado com sucesso!');
      
      // Reset form
      elements.userForm.reset();
      
      // Reset to first page and reload users
      state.pagination.currentPage = 1;
      await loadUsers();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Erro ao criar usuário';
      showMessage('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId, userData) => {
    try {
      setLoading(true);
      await userService.updateUser(userId, {
        name: userData.name,
        email: userData.email,
        age: parseInt(userData.age)
      });
      
      state.editingUser = null;
      showMessage('success', 'Usuário atualizado com sucesso!');
      
      if (state.isSearching) {
        searchUsers();
      } else {
        loadUsers();
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Erro ao atualizar usuário';
      showMessage('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId) => {
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        setLoading(true);
        await userService.deleteUser(userId);
        showMessage('success', 'Usuário excluído com sucesso!');
        
        if (state.isSearching) {
          searchUsers();
        } else {
          loadUsers();
        }
      } catch (error) {
        showMessage('error', 'Erro ao excluir usuário');
      } finally {
        setLoading(false);
      }
    }
  };

  // Rendering Functions
  const renderUsersList = () => {
    elements.usersList.innerHTML = '';
    
    if (state.users.length === 0) {
      const noUsersTemplate = state.isSearching 
        ? elements.templates.noSearchResults.content.cloneNode(true)
        : elements.templates.noUsers.content.cloneNode(true);
      
      elements.usersList.appendChild(noUsersTemplate);
      return;
    }
    
    state.users.forEach(user => {
      if (state.editingUser === user.id) {
        renderEditForm(user);
      } else {
        renderUserItem(user);
      }
    });
  };

  const renderUserItem = (user) => {
    const template = elements.templates.userItem.content.cloneNode(true);
    
    template.querySelector('.user-name').textContent = user.name;
    template.querySelector('.user-email').textContent = user.email;
    template.querySelector('.user-age').textContent = `${user.age} anos`;
    
    const userItem = template.querySelector('.user-item');
    userItem.dataset.userId = user.id;
    
    const editBtn = template.querySelector('.edit-btn');
    editBtn.addEventListener('click', () => handleEdit(user));
    
    const deleteBtn = template.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', () => deleteUser(user.id));
    
    elements.usersList.appendChild(template);
  };

  const renderEditForm = (user) => {
    const template = elements.templates.editForm.content.cloneNode(true);
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    userItem.dataset.userId = user.id;
    
    const nameInput = template.querySelector('.edit-name');
    const emailInput = template.querySelector('.edit-email');
    const ageInput = template.querySelector('.edit-age');
    
    nameInput.value = user.name;
    emailInput.value = user.email;
    ageInput.value = user.age;
    
    const saveBtn = template.querySelector('.save-btn');
    saveBtn.addEventListener('click', () => {
      updateUser(user.id, {
        name: nameInput.value,
        email: emailInput.value,
        age: ageInput.value
      });
    });
    
    const cancelBtn = template.querySelector('.cancel-btn');
    cancelBtn.addEventListener('click', handleCancelEdit);
    
    userItem.appendChild(template);
    elements.usersList.appendChild(userItem);
  };

  // Event Handlers
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const name = elements.nameInput.value.trim();
    const email = elements.emailInput.value.trim();
    const age = elements.ageInput.value;
    
    if (!name || !email || !age) {
      showMessage('error', 'Todos os campos são obrigatórios');
      return;
    }

    if (parseInt(age) <= 0) {
      showMessage('error', 'Idade deve ser um número positivo');
      return;
    }

    createUser({ name, email, age });
  };

  const handleEdit = (user) => {
    state.editingUser = user.id;
    renderUsersList();
  };

  const handleCancelEdit = () => {
    state.editingUser = null;
    renderUsersList();
  };

  const handleSearch = () => {
    const searchTerm = elements.searchInput.value.trim();
    state.searchTerm = searchTerm;
    
    if (searchTerm) {
      state.isSearching = true;
      state.pagination.currentPage = 1;
      searchUsers();
      elements.clearSearchBtn.style.display = 'block';
    } else {
      state.isSearching = false;
      state.pagination.currentPage = 1;
      loadUsers();
      elements.clearSearchBtn.style.display = 'none';
    }
  };

  const handlePageChange = (newPage) => {
    const totalPages = Math.ceil(state.pagination.totalUsers / state.pagination.usersPerPage);
    
    if (newPage >= 1 && newPage <= totalPages) {
      state.pagination.currentPage = newPage;
      
      if (state.isSearching) {
        searchUsers();
      } else {
        loadUsers();
      }
    }
  };

  // Event Listeners
  elements.userForm.addEventListener('submit', handleSubmit);
  elements.refreshButton.addEventListener('click', () => {
    if (state.isSearching) {
      searchUsers();
    } else {
      loadUsers();
    }
  });
  
  elements.searchInput.addEventListener('input', () => {
    const searchTerm = elements.searchInput.value.trim();
    elements.clearSearchBtn.style.display = searchTerm ? 'block' : 'none';
    
    // Debounce search
    clearTimeout(elements.searchInput.timeout);
    elements.searchInput.timeout = setTimeout(handleSearch, 500);
  });
  
  elements.clearSearchBtn.addEventListener('click', () => {
    elements.searchInput.value = '';
    state.searchTerm = '';
    state.isSearching = false;
    elements.clearSearchBtn.style.display = 'none';
    state.pagination.currentPage = 1;
    loadUsers();
  });
  
  // Pagination event listeners
  elements.pagination.firstPageBtn.addEventListener('click', () => handlePageChange(1));
  elements.pagination.prevPageBtn.addEventListener('click', () => handlePageChange(state.pagination.currentPage - 1));
  elements.pagination.nextPageBtn.addEventListener('click', () => handlePageChange(state.pagination.currentPage + 1));
  elements.pagination.lastPageBtn.addEventListener('click', () => {
    const totalPages = Math.ceil(state.pagination.totalUsers / state.pagination.usersPerPage);
    handlePageChange(totalPages);
  });

  // Initialize
  loadUsers();
});
