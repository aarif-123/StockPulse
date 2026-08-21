/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, Role, OrgRole, UserOrganizationSummary } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  organizations: UserOrganizationSummary[];
  activeOrg: UserOrganizationSummary | null;
  isSuperAdmin: boolean;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: User, organizations?: UserOrganizationSummary[]) => void;
  logout: () => void;
  switchOrganization: (orgId: string) => void;
  hasRole: (roles: Role[] | OrgRole[]) => boolean;

  // Super Admin Support / Impersonation Session
  isSupportMode: boolean;
  supportSessionId: string | null;
  startSupportSession: (sessionToken: string, sessionId: string, targetUser: User, targetOrg: UserOrganizationSummary) => void;
  exitSupportSession: () => Promise<void>;

  // Legacy Backdoor aliases
  isBackdoorMode: boolean;
  startBackdoorSession: (sessionToken: string, sessionId: string, targetUser: User) => void;
  exitBackdoorSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<UserOrganizationSummary[]>([]);
  const [activeOrg, setActiveOrg] = useState<UserOrganizationSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSupportMode, setIsSupportMode] = useState<boolean>(false);
  const [supportSessionId, setSupportSessionId] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('authUser');
    const storedOrgs = localStorage.getItem('userOrganizations');
    const storedActiveOrgId = localStorage.getItem('activeOrgId');
    const origToken = localStorage.getItem('originalAdminToken');
    const sSessionId = localStorage.getItem('supportSessionId');

    if (origToken && sSessionId) {
      setIsSupportMode(true);
      setSupportSessionId(sSessionId);
    }

    if (storedToken && storedUser) {
      setToken(storedToken);
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);

        if (storedOrgs) {
          const parsedOrgs: UserOrganizationSummary[] = JSON.parse(storedOrgs);
          setOrganizations(parsedOrgs);

          const matchingActive = parsedOrgs.find((o) => o.organizationId === storedActiveOrgId) || parsedOrgs[0] || null;
          setActiveOrg(matchingActive);
          if (matchingActive) {
            localStorage.setItem('activeOrgId', matchingActive.organizationId);
          }
        }
      } catch {
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        localStorage.removeItem('userOrganizations');
        localStorage.removeItem('activeOrgId');
      }
    }
    setLoading(false);
  }, []);

  const login = (newToken: string, newUser: User, userOrgs: UserOrganizationSummary[] = []) => {
    setToken(newToken);
    setUser(newUser);
    setOrganizations(userOrgs);

    localStorage.setItem('authToken', newToken);
    localStorage.setItem('authUser', JSON.stringify(newUser));
    localStorage.setItem('userOrganizations', JSON.stringify(userOrgs));

    const defaultOrg = userOrgs[0] || null;
    setActiveOrg(defaultOrg);
    if (defaultOrg) {
      localStorage.setItem('activeOrgId', defaultOrg.organizationId);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setOrganizations([]);
    setActiveOrg(null);
    setIsSupportMode(false);
    setSupportSessionId(null);

    localStorage.removeItem('authToken');
    localStorage.removeItem('authUser');
    localStorage.removeItem('userOrganizations');
    localStorage.removeItem('activeOrgId');
    localStorage.removeItem('originalAdminToken');
    localStorage.removeItem('originalAdminUser');
    localStorage.removeItem('supportSessionId');
  };

  const switchOrganization = (orgId: string) => {
    const target = organizations.find((o) => o.organizationId === orgId);
    if (target) {
      setActiveOrg(target);
      localStorage.setItem('activeOrgId', target.organizationId);
      // Trigger state re-render or reload for clean cache
      window.location.reload();
    }
  };

  const startSupportSession = (
    sessionToken: string,
    sessionId: string,
    targetUser: User,
    targetOrg: UserOrganizationSummary
  ) => {
    const currentToken = token || localStorage.getItem('authToken') || '';
    const currentUserStr = localStorage.getItem('authUser') || JSON.stringify(user || {});

    localStorage.setItem('originalAdminToken', currentToken);
    localStorage.setItem('originalAdminUser', currentUserStr);
    localStorage.setItem('supportSessionId', sessionId);

    localStorage.setItem('authToken', sessionToken);
    localStorage.setItem('authUser', JSON.stringify(targetUser));
    localStorage.setItem('activeOrgId', targetOrg.organizationId);
    localStorage.setItem('userOrganizations', JSON.stringify([targetOrg]));

    setToken(sessionToken);
    setUser(targetUser);
    setActiveOrg(targetOrg);
    setOrganizations([targetOrg]);
    setIsSupportMode(true);
    setSupportSessionId(sessionId);
  };

  const exitSupportSession = async () => {
    const sessionId = supportSessionId || localStorage.getItem('supportSessionId');
    const origToken = localStorage.getItem('originalAdminToken');
    const origUserStr = localStorage.getItem('originalAdminUser');

    if (sessionId) {
      try {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        await fetch(`${apiBaseUrl}/platform/support/stop/${sessionId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${origToken || token}`,
          },
        });
      } catch (err) {
        console.error('Failed to report support session stop to server:', err);
      }
    }

    localStorage.removeItem('originalAdminToken');
    localStorage.removeItem('originalAdminUser');
    localStorage.removeItem('supportSessionId');

    setIsSupportMode(false);
    setSupportSessionId(null);

    if (origToken && origUserStr) {
      localStorage.setItem('authToken', origToken);
      localStorage.setItem('authUser', origUserStr);
      setToken(origToken);
      const parsedUser = JSON.parse(origUserStr);
      setUser(parsedUser);
      window.location.href = '/platform';
    } else {
      logout();
    }
  };

  const isAuthenticated = Boolean(token);
  const isSuperAdmin = Boolean(user?.isSuperAdmin);

  const hasRole = (roles: (Role | OrgRole)[]): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true; // Super admins have bypass in UI
    const activeRole = activeOrg?.role || user.role;
    if (!activeRole) return false;
    const strRoles = roles as string[];
    return (
      strRoles.includes(activeRole) ||
      (activeRole === 'ORG_ADMIN' && strRoles.includes('ADMIN')) ||
      (activeRole === 'ADMIN' && strRoles.includes('ORG_ADMIN'))
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        organizations,
        activeOrg,
        isSuperAdmin,
        isAuthenticated,
        loading,
        login,
        logout,
        switchOrganization,
        hasRole,
        isSupportMode,
        supportSessionId,
        startSupportSession,
        exitSupportSession,
        isBackdoorMode: isSupportMode,
        startBackdoorSession: (sessionToken: string, sessionId: string, targetUser: User) => {
          const fallbackOrg: UserOrganizationSummary = organizations[0] || {
            organizationId: 'default',
            organizationName: 'Target Org',
            organizationSlug: 'target',
            role: 'ORG_ADMIN',
            status: 'ACTIVE',
          };
          startSupportSession(sessionToken, sessionId, targetUser, fallbackOrg);
        },
        exitBackdoorSession: exitSupportSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
