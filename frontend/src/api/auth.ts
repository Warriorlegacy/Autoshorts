const API_BASE_URL = '/api';

export interface LoginResponse {
  success: boolean;
  user: {
    id: string;
    email: string;
    name?: string;
  };
  token: string;
}

/**
 * Extract error message from API response
 */
const getErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = await response.json();
    return data.error?.message || data.message || `HTTP ${response.status}`;
  } catch {
    return `HTTP ${response.status}: ${response.statusText}`;
  }
};

export const authAPI = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const errorMessage = await getErrorMessage(response);
      throw new Error(errorMessage);
    }

    return response.json();
  },

  register: async (email: string, password: string, name?: string): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const errorMessage = await getErrorMessage(response);
      throw new Error(errorMessage);
    }

    return response.json();
  },

  logout: async (): Promise<void> => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await fetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorMessage = await getErrorMessage(response);
        console.warn('Logout API error:', errorMessage);
        // Continue logout even if API fails
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Always clear local storage even if API fails
    }
  },

  me: async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('No authentication token found');
    }

    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorMessage = await getErrorMessage(response);
      throw new Error(errorMessage);
    }

    return response.json();
  },
};