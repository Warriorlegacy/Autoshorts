import { useEffect } from 'react';
import { useAuthStore } from '../store/authStore';

export const useAuth = () => {
  const { user, token, isAuthenticated, isLoading, error, login, register, logout, clearError } = useAuthStore();

  useEffect(() => {
    const validateStoredToken = async () => {
      // Check if token exists in localStorage on mount
      try {
        const storedToken = localStorage.getItem('token');
        if (storedToken && !isAuthenticated) {
          // Validate token with API
          await useAuthStore.getState().me();
        }
      } catch (err) {
        // Error already handled by authStore.me()
        console.error('Token validation failed:', err);
        // Clear invalid token
        localStorage.removeItem('token');
        useAuthStore.getState().logout();
      }
    };

    validateStoredToken();
  }, [isAuthenticated]);

  const { me } = useAuthStore.getState();
  
  return {
    user,
    token,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    clearError,
    me,
  };
};