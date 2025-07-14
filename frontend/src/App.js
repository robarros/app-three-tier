import React, { useState, useEffect } from 'react';
import { userService } from './services/userService';

function App() {
  const [users, setUsers] = useState([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: ''
  });
  const [editingUser, setEditingUser] = useState(null);
  const [editData, setEditData] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalUsers: 0,
    usersPerPage: 10
  });

  useEffect(() => {
    loadUsers();
  }, [pagination.currentPage]); // Reload when page changes

  const loadUsers = async () => {
    try {
      setLoading(true);
      const data = await userService.getUsers(pagination.currentPage, pagination.usersPerPage);
      console.log('Loaded users:', data);
      setUsers(data.items || []);
      
      // Get total count in a separate call for now
      const allUsers = await userService.getUsers(1, 1000000);
      const total = allUsers.items ? allUsers.items.length : 0;
      console.log('Total users:', total);
      
      setPagination(prev => ({
        ...prev,
        totalUsers: total
      }));
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage({ type: 'error', text: 'Erro ao carregar usuários' });
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(pagination.totalUsers / pagination.usersPerPage);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPagination(prev => ({
        ...prev,
        currentPage: newPage
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.age) {
      setMessage({ type: 'error', text: 'Todos os campos são obrigatórios' });
      return;
    }

    if (formData.age <= 0) {
      setMessage({ type: 'error', text: 'Idade deve ser um número positivo' });
      return;
    }

    try {
      setLoading(true);
      await userService.createUser({
        name: formData.name,
        email: formData.email,
        age: parseInt(formData.age)
      });
      
      setFormData({ name: '', email: '', age: '' });
      setMessage({ type: 'success', text: 'Usuário criado com sucesso!' });
      
      // Reset to first page and reload users
      setPagination(prev => ({
        ...prev,
        currentPage: 1
      }));
      await loadUsers(); // Explicitly reload users after creating
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Erro ao criar usuário';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user.id);
    setEditData({
      name: user.name,
      email: user.email,
      age: user.age
    });
  };

  const handleUpdate = async (userId) => {
    try {
      setLoading(true);
      await userService.updateUser(userId, {
        name: editData.name,
        email: editData.email,
        age: parseInt(editData.age)
      });
      
      setEditingUser(null);
      setEditData({});
      setMessage({ type: 'success', text: 'Usuário atualizado com sucesso!' });
      loadUsers();
    } catch (error) {
      const errorMessage = error.response?.data?.detail || 'Erro ao atualizar usuário';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        setLoading(true);
        await userService.deleteUser(userId);
        setMessage({ type: 'success', text: 'Usuário excluído com sucesso!' });
        loadUsers();
      } catch (error) {
        setMessage({ type: 'error', text: 'Erro ao excluir usuário' });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditData({});
  };

  return (
    <div className="container">
      <div className="header">
        <h1>Gerenciamento de Usuários</h1>
        <button 
          onClick={loadUsers} 
          className="btn btn-refresh"
          disabled={loading}
          title="Atualizar lista"
        >
          ↻
        </button>
      </div>

      {message.text && (
        <div className={`${message.type === 'error' ? 'error-message' : 'success-message'}`}>
          {message.text}
        </div>
      )}

      <div className="user-form">
        <h2>Adicionar Novo Usuário</h2>
        <form onSubmit={handleSubmit}>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="name">Nome Completo:</label>
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Digite o nome completo"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email:</label>
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Digite o email"
                disabled={loading}
              />
            </div>
            
            <div className="form-group">
              <label htmlFor="age">Idade:</label>
              <input
                type="number"
                id="age"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="Digite a idade"
                min="1"
                disabled={loading}
              />
            </div>
            
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>

      <div className="users-list">
        <div className="users-header">
          <h2>Lista de Usuários ({pagination.totalUsers})</h2>
        </div>
        
        {users.length === 0 ? (
          <div className="no-users">
            <p>Nenhum usuário cadastrado ainda.</p>
          </div>
        ) : (
          <>
            {users.map((user) => (
              <div key={user.id} className="user-item">
                {editingUser === user.id ? (
                  <div className="edit-form">
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      placeholder="Nome Completo"
                    />
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      placeholder="Email"
                    />
                    <input
                      type="number"
                      value={editData.age}
                      onChange={(e) => setEditData({ ...editData, age: e.target.value })}
                      placeholder="Idade"
                      min="1"
                    />
                    <button
                      onClick={() => handleUpdate(user.id)}
                      className="btn btn-primary btn-sm"
                      disabled={loading}
                    >
                      Salvar
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      className="btn btn-secondary btn-sm"
                      disabled={loading}
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="user-info">
                      <div className="user-name">{user.name}</div>
                      <div className="user-email">{user.email}</div>
                    </div>
                    <div className="user-age">{user.age} anos</div>
                    <div className="user-actions">
                      <button
                        onClick={() => handleEdit(user)}
                        className="btn btn-secondary btn-sm"
                        disabled={loading}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn btn-danger btn-sm"
                        disabled={loading}
                      >
                        Excluir
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            
            <div className="pagination">
              <button
                className="btn btn-secondary"
                onClick={() => handlePageChange(1)}
                disabled={pagination.currentPage === 1 || loading}
              >
                Primeira
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => handlePageChange(pagination.currentPage - 1)}
                disabled={pagination.currentPage === 1 || loading}
              >
                Anterior
              </button>
              
              <span className="page-info">
                Página {pagination.currentPage} de {totalPages} 
                ({pagination.totalUsers} usuários)
              </span>

              <button
                className="btn btn-secondary"
                onClick={() => handlePageChange(pagination.currentPage + 1)}
                disabled={pagination.currentPage >= totalPages || loading}
              >
                Próxima
              </button>

              <button
                className="btn btn-secondary"
                onClick={() => handlePageChange(totalPages)}
                disabled={pagination.currentPage >= totalPages || loading}
              >
                Última
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
