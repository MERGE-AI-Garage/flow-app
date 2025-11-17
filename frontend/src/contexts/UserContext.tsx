import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { users } from '../api';
import { User } from '../types';

interface UserContextType {
  currentUser: User | null;
  allUsers: User[];
  setCurrentUser: (user: User) => void;
  loading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }): React.ReactElement {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (): Promise<void> => {
    try {
      setLoading(true);
      // Load all users for the dropdown
      const usersResponse = await users.list();
      const usersList = Array.isArray(usersResponse.data) ? usersResponse.data : [];
      setAllUsers(usersList);

      // Set first user as default if available
      if (usersList.length > 0) {
        // Check if we have a saved user in localStorage
        const savedUserId = localStorage.getItem('current_user_id');
        const savedUser = savedUserId
          ? usersList.find(u => u.id === parseInt(savedUserId))
          : null;

        setCurrentUser(savedUser || usersList[0]);
      }
    } catch (error) {
      console.error('Failed to load users:', error);
      setAllUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSetCurrentUser = (user: User): void => {
    setCurrentUser(user);
    // Save to localStorage so selection persists across page refreshes
    localStorage.setItem('current_user_id', user.id.toString());
  };

  return (
    <UserContext.Provider
      value={{
        currentUser,
        allUsers,
        setCurrentUser: handleSetCurrentUser,
        loading,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser(): UserContextType {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
