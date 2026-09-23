
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, Permission, Employee, CompanyProfileSetting } from '../types'; 
import { 
    apiLogin, apiChangePassword, apiGetUserById, apiUpdateUser, 
    apiGetRolePermissions, apiGetDepartmentRolePermissions, apiLogout,
    apiSeedServiceCategories,
    apiSeedMarketingCapsuleProject,
    apiGetCompanyProfile,
    apiEnsureGlobalRolePermissionsSeeded,
} from '../services/api';
import { DEFAULT_ROLE_PERMISSIONS } from '../permissions.config';
import { auth } from '../firebase'; // Import Firebase auth instance
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { useInactivityTimer } from '../hooks/useInactivityTimer';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  companyProfile: CompanyProfileSetting | null; // New: Add company profile to context
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<boolean>;
  updateUserContext: (updatedUser: User | Employee) => void; 
  updateCompanyProfileContext: (profile: CompanyProfileSetting) => void; // New: updater function
  userPermissions: Permission[]; 
  hasPermission: (permission: Permission) => boolean; 
  refreshUserPermissions: () => Promise<void>; // New function
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_ACCOUNT_EMAIL = import.meta.env.VITE_DEMO_ACCOUNT_EMAIL || 'test@marketingcapsule.com';
const DEMO_ACCOUNT_PASSWORD = import.meta.env.VITE_DEMO_ACCOUNT_PASSWORD || '123456';
const DEMO_ACCOUNT_NAME = import.meta.env.VITE_DEMO_ACCOUNT_NAME || 'Demo Owner';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | Employee | null>(null); 
  // Initialize company profile from localStorage to make it available immediately on load,
  // especially for the login page when not authenticated.
  const [companyProfile, setCompanyProfile] = useState<CompanyProfileSetting | null>(() => {
    try {
      const storedProfile = localStorage.getItem('companyProfile');
      return storedProfile ? JSON.parse(storedProfile) : null;
    } catch (error) {
      console.error("Failed to parse company profile from localStorage:", error);
      return null;
    }
  });
  const [userPermissions, setUserPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserPermissions = async (userProfile: User | Employee): Promise<Permission[]> => {
    const { role, permissions: userSpecificPermissions } = userProfile;
    const departmentId = (userProfile as Employee).departmentId;

    // 1. Check for user-specific override. If present (even if an empty array), it's the source of truth.
    if (userSpecificPermissions && Array.isArray(userSpecificPermissions)) {
        return userSpecificPermissions;
    }
    
    if (role === UserRole.OWNER) {
        return Object.values(Permission);
    }
    // 2. Department-specific permissions check...
    if (departmentId) {
        try {
            const deptSpecificPermissions = await apiGetDepartmentRolePermissions(departmentId, role);
            if (deptSpecificPermissions) return deptSpecificPermissions;
        } catch (error) {
            console.error(`Failed to get department-specific permissions for role ${role} in dept ${departmentId}:`, error);
        }
    }
    // 3. Global custom permissions check...
    try {
      const globalCustomPermissions = await apiGetRolePermissions(role);
      if (globalCustomPermissions && globalCustomPermissions.length > 0) {
         return globalCustomPermissions;
      }
    } catch (error) {
      console.error(`Failed to get global custom permissions for role ${role}:`, error);
    }

    // 4. Fallback to default
    return DEFAULT_ROLE_PERMISSIONS[role] || [];
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser: firebase.User | null) => {
      if (firebaseUser) {
        try {
          // Fetch user profile and company profile in parallel when user is logged in.
          // This ensures the profile is fresh if it was changed in another session.
          const [userProfileData, companyProfileData] = await Promise.all([
            apiGetUserById(firebaseUser.uid),
            apiGetCompanyProfile()
          ]);
          
          const userProfile = userProfileData;
          if (!userProfile) {
            console.error(`User profile not found in Firestore for UID: ${firebaseUser.uid}. This user cannot log in until their profile is created in the 'users' collection.`);
            throw new Error("User profile does not exist in the database.");
          }
          
          setUser(userProfile);
          // Set company profile in state and cache in localStorage for logged-out access.
          setCompanyProfile(companyProfileData); 
          if (companyProfileData) {
            localStorage.setItem('companyProfile', JSON.stringify(companyProfileData));
          } else {
            localStorage.removeItem('companyProfile');
          }
          
          const permissions = await fetchUserPermissions(userProfile);
          setUserPermissions(permissions);

          // Seed initial data if user is an admin/owner and seeding hasn't occurred
          if (userProfile.role === UserRole.OWNER || userProfile.role === UserRole.ADMIN) {
              const seeded = localStorage.getItem('initialDataSeeded_v1_4'); // BUMPED VERSION
              if (!seeded) {
                  try {
                  console.log("Running one-time data seeding...");
                  await apiSeedServiceCategories();
                  await apiSeedMarketingCapsuleProject();
                  localStorage.setItem('initialDataSeeded_v1_4', 'true'); // BUMPED VERSION
                  console.log("Initial data seeding complete.");
                  } catch (seedError) {
                      console.error("Initial data seeding skipped due to error:", seedError);
                  }
              }

              // Ensure Firestore role_permissions match app defaults so security rules align with UI permissions
              try {
                  const roleSeedResult = await apiEnsureGlobalRolePermissionsSeeded();
                  if (roleSeedResult.seeded.length > 0) {
                      console.log('Seeded global role permissions:', roleSeedResult.seeded.join(', '));
                  }
              } catch (roleSeedError) {
                  console.warn('Global role permissions seed skipped:', roleSeedError);
              }

              try {
                  // Demo owner account creation removed
              } catch (demoError) {
                  console.error("Failed to ensure demo account:", demoError);
              }
          }


        } catch (error) {
          console.error("Failed to fetch or provision user/company profile:", error);
          await apiLogout(); // Log out on error. This will re-trigger onAuthStateChanged.
        }
      } else {
        // User is signed out. Clear user-specific data.
        // The company profile is already loaded from localStorage via useState initializer,
        // so no unauthenticated Firestore fetch is needed here.
        setUser(null);
        setUserPermissions([]);
      }
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  const login = async (usernameOrEmail: string, password: string): Promise<void> => {
    setLoading(true);
    const normalizedIdentifier = usernameOrEmail.trim().toLowerCase();
    const demoEmailNormalized = DEMO_ACCOUNT_EMAIL.toLowerCase();
    const isDemoAccountAttempt = normalizedIdentifier === demoEmailNormalized;
    const fallbackDemoPassword = password || DEMO_ACCOUNT_PASSWORD;

    const attemptLogin = async (allowDemoRecovery: boolean) => {
      try {
        await apiLogin(usernameOrEmail, password);
        // onAuthStateChanged will handle setting loading=false on success
      } catch (error: any) {
        const errorCode = error?.code || '';
        const shouldAttemptDemoRecovery = allowDemoRecovery && isDemoAccountAttempt && (
          errorCode === 'auth/user-not-found' ||
          errorCode === 'auth/wrong-password' ||
          errorCode === 'auth/invalid-credential' ||
          errorCode === 'auth/user-disabled'
        );

        if (shouldAttemptDemoRecovery) {
          try {
            console.warn('Demo login failed; attempting to recreate demo account...');
            // Demo owner account creation removed
            await apiLogin(DEMO_ACCOUNT_EMAIL, fallbackDemoPassword);
            return;
          } catch (recoveryError) {
            console.error('Failed to recreate demo account:', recoveryError);
          }
        }

        console.error("Login failed:", error);
        setLoading(false); // Only set loading false here on error
        throw error; // Re-throw the error
      }
    };

    await attemptLogin(true);
  };

  const logout = async () => {
    await apiLogout();
    // onAuthStateChanged will handle clearing user state. The company profile from localStorage remains.
  };

  const changePassword = async (newPassword: string): Promise<boolean> => {
    if (!user) return false;
    setLoading(true);
    try {
      const success = await apiChangePassword(newPassword);
      if (success) {
        // Immediately update local user state to clear requiresPasswordChange flag
        // This prevents the user from being stuck on the password change page
        if (user) {
          setUser({ ...user, requiresPasswordChange: false });
        }
        
        // Refresh user data from Firestore to ensure requiresPasswordChange flag is updated
        // Use a more resilient approach - fetch user profile but don't fail if permissions can't be fetched
        try {
          const freshUserProfile = await apiGetUserById(user.id);
          if (freshUserProfile) {
            setUser(freshUserProfile); // Update user object with fresh data
            // Try to fetch permissions, but don't fail if it errors (especially for first-time login)
            try {
              const permissions = await fetchUserPermissions(freshUserProfile);
              setUserPermissions(permissions);
            } catch (permError) {
              // Permission fetching failed - use default permissions for the role
              console.warn("Could not fetch permissions after password change, using defaults:", permError);
              const defaultPerms = DEFAULT_ROLE_PERMISSIONS[freshUserProfile.role] || [];
              setUserPermissions(defaultPerms);
            }
          } else {
            // If we can't fetch fresh profile, ensure requiresPasswordChange is still false locally
            if (user) {
              setUser({ ...user, requiresPasswordChange: false });
            }
          }
        } catch (refreshError) {
          // Even if refresh fails, password change was successful
          console.warn("Could not refresh user data after password change:", refreshError);
          // Ensure the local user state reflects password change completion
          if (user) {
            setUser({ ...user, requiresPasswordChange: false });
            // Use default permissions as fallback
            const defaultPerms = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
            setUserPermissions(defaultPerms);
          }
        }
      }
      setLoading(false);
      return success;
    } catch (error) {
      console.error("Password change failed:", error);
      setLoading(false);
      return false;
    }
  };

  const updateUserContext = async (updatedUserData: User | Employee) => {
    // Refreshing is the safest way to ensure all permission states are correct after any profile update.
    await refreshUserPermissions();
  };

  const refreshUserPermissions = async () => {
    if (user) {
        const freshUserProfile = await apiGetUserById(user.id);
        if (!freshUserProfile) return; // User might have been deleted
        
        setUser(freshUserProfile); // This updates the user object in context
        const permissions = await fetchUserPermissions(freshUserProfile);
        setUserPermissions(permissions);
        console.log("AuthContext: User permissions have been refreshed.");
    }
  };
  
  // Update company profile in context and cache it in localStorage
  const updateCompanyProfileContext = (profile: CompanyProfileSetting) => {
      setCompanyProfile(profile);
      try {
        localStorage.setItem('companyProfile', JSON.stringify(profile));
      } catch (error) {
        console.error("Failed to save company profile to localStorage:", error);
      }
  };

  const hasPermission = (permissionToCheck: Permission): boolean => {
    return userPermissions.includes(permissionToCheck);
  };

  const rawTimeoutHours = companyProfile?.inactivityTimeoutHours;
  const parsedTimeoutHours = Number(rawTimeoutHours);
  const inactivityTimeoutHours = Number.isFinite(parsedTimeoutHours) ? Math.max(parsedTimeoutHours, 0) : 3;
  const isTimerActive = !!user && inactivityTimeoutHours > 0;

  // Auto-logout on inactivity (configurable hours from company profile, default 3)
  const handleInactivity = useCallback(async () => {
    if (user) {
      console.log(`User inactive for ${inactivityTimeoutHours} hours. Logging out...`);
      await apiLogout();
      // onAuthStateChanged will handle clearing user state
    }
  }, [user, inactivityTimeoutHours]);
  
  // Log timer status for debugging (only in development)
  useEffect(() => {
    if (isTimerActive && inactivityTimeoutHours > 0) {
      console.log(`Auto-logout timer active: ${inactivityTimeoutHours} hours of inactivity`);
    }
  }, [isTimerActive, inactivityTimeoutHours]);
  
  useInactivityTimer(handleInactivity, isTimerActive, inactivityTimeoutHours);

  return (
    <AuthContext.Provider value={{ user, loading, companyProfile, login, logout, changePassword, updateUserContext, updateCompanyProfileContext, userPermissions, hasPermission, refreshUserPermissions }}>
      {children}
    </AuthContext.Provider>
  );
};
